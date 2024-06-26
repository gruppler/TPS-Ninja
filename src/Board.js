import { Square, atoi } from "./Square.js";
import { Piece } from "./Piece.js";
import { Ply } from "./Ply.js";
import { findRoads } from "./Roads.js";

import { cloneDeep, isNumber, isString, times, zip } from "lodash-es";

const pieceCounts = {
  3: { flat: 10, cap: 0 },
  4: { flat: 15, cap: 0 },
  5: { flat: 21, cap: 1 },
  6: { flat: 30, cap: 1 },
  7: { flat: 40, cap: 2 },
  8: { flat: 50, cap: 2 },
};

export const parseTPS = function (tps) {
  const matchData = tps
    .toUpperCase()
    .match(/^([X1-8SC,/-]+)\s+([12])\s+(\d+)$/);
  const result = {};

  if (!matchData) {
    result.error = "Invalid TPS notation";
    return result;
  }

  [, result.grid, result.player, result.linenum] = matchData;

  result.grid = result.grid
    .replace(/X(\d+)/g, (x, count) => {
      const spaces = ["X"];
      while (spaces.length < count) {
        spaces.push("X");
      }
      return spaces.join(",");
    })
    .split(/[/-]/)
    .reverse()
    .map((row) => row.split(","));
  result.size = result.grid.length;
  result.player = Number(result.player);
  result.linenum = Number(result.linenum);

  const validCell = /^(X|[12]+[SC]?)$/;
  if (
    result.grid.find(
      (row) =>
        row.length !== result.size || row.find((cell) => !validCell.test(cell))
    )
  ) {
    result.error = "Invalid TPS notation";
  }
  return result;
};

export const transformTPS = function (tps, [rotate, flip]) {
  if (isString(tps)) {
    tps = parseTPS(tps);
    if (tps.error) {
      throw tps.error;
    }
  }

  rotate = rotate % 4;
  flip = flip % 2;
  let grid = cloneDeep(tps.grid);

  if (rotate === 1) {
    grid = zip(...grid.map((row) => row.reverse()));
  } else if (rotate === 2) {
    grid = grid.map((row) => row.reverse()).reverse();
  } else if (rotate === 3) {
    grid = zip(...grid).map((row) => row.reverse());
  }

  if (flip) {
    grid = grid.map((row) => row.reverse());
  }

  tps.grid = grid;
};

export const Board = class {
  constructor(options = {}) {
    this.options = { opening: "swap", ...options };
    this.errors = [];

    if (isString(options.tps) && options.tps.length) {
      const tps = parseTPS(options.tps);
      if (tps.error) {
        this.errors.push(tps.error);
        return;
      }
      if (options.transform) {
        transformTPS(tps, options.transform);
        this.transform = options.transform;
      }
      this.grid = tps.grid;
      this.size = tps.size;
      this.player = tps.player;
      this.linenum = tps.linenum;
    } else if (isNumber(options.size || options.tps)) {
      this.size = options.size || options.tps;
      this.player = 1;
      this.linenum = 1;
    } else {
      this.errors.push("Missing TPS or board size");
      return;
    }

    if (!(String(this.size) in pieceCounts)) {
      this.errors.push("Invalid board size");
      return;
    }

    // Set up piece counts
    this.pieceCounts = {
      1: { ...pieceCounts[this.size] },
      2: { ...pieceCounts[this.size] },
    };
    if (options.flats > 2) {
      this.pieceCounts[1].flat = Number(options.flats);
      this.pieceCounts[2].flat = Number(options.flats);
    }
    if ("caps" in options && options.caps >= 0) {
      this.pieceCounts[1].cap = Number(options.caps);
      this.pieceCounts[2].cap = Number(options.caps);
    }
    if (options.flats1 > 2) {
      this.pieceCounts[1].flat = Number(options.flats1);
    }
    if ("caps1" in options && options.caps1 >= 0) {
      this.pieceCounts[1].cap = Number(options.caps1);
    }
    if (options.flats2 > 2) {
      this.pieceCounts[2].flat = Number(options.flats2);
    }
    if ("caps2" in options && options.caps2 >= 0) {
      this.pieceCounts[2].cap = Number(options.caps2);
    }
    this.pieceCounts[1].total =
      this.pieceCounts[1].flat + this.pieceCounts[1].cap;
    this.pieceCounts[2].total =
      this.pieceCounts[2].flat + this.pieceCounts[2].cap;

    if (options.komi) {
      this.komi = Number(options.komi);
      if (this.komi % 1) {
        this.komi = Math.floor(this.komi) + 0.5;
      }
    }

    // Create pieces
    this.pieces = {
      all: {
        1: { flat: [], cap: [] },
        2: { flat: [], cap: [] },
      },
      played: {
        1: { flat: [], cap: [] },
        2: { flat: [], cap: [] },
      },
    };
    [1, 2].forEach((color) => {
      ["flat", "cap"].forEach((type) => {
        for (let index = 0; index < this.pieceCounts[color][type]; index++) {
          this.pieces.all[color][type][index] = new Piece({
            index: index,
            color: color,
            type: type,
          });
        }
      });
    });

    this.squares = [];
    for (let y = 0; y < this.size; y++) {
      this.squares[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.squares[y][x] = new Square(x, y, this.size);
      }
    }

    // Create squares
    this.squares.forEach((row) => {
      row.forEach((square) => {
        if (!square.edges.N) {
          square.neighbors.N = this.squares[square.y + 1][square.x];
        }
        if (!square.edges.S) {
          square.neighbors.S = this.squares[square.y - 1][square.x];
        }
        if (!square.edges.E) {
          square.neighbors.E = this.squares[square.y][square.x + 1];
        }
        if (!square.edges.W) {
          square.neighbors.W = this.squares[square.y][square.x - 1];
        }
      });
    });

    // Do TPS
    if (this.grid) {
      let stack, square, piece, type;
      this.grid.forEach((row, y) => {
        row.forEach((col, x) => {
          if (col[0] !== "X") {
            stack = col.split("");
            square = this.squares[y][x];
            while ((piece = stack.shift())) {
              if (/[SC]/.test(stack[0])) {
                type = stack.shift();
              } else {
                type = "flat";
              }
              this.playPiece(piece, type, square);
            }
          }
        });
      });
    }

    this.afterPly();
  }

  afterPly() {
    // Count flats
    this.flats = [0, 0];
    this.squares.forEach((row) => {
      row.forEach((square) => {
        if (square.color && square.piece.isFlat()) {
          this.flats[square.color - 1]++;
        }
      });
    });
    if (this.komi) {
      this.flats[1 * (this.komi > 0)] += Math.abs(this.komi);
    }

    // Check for game end
    this.isGameEnd = false;
    this.result = "";
    const roads = findRoads(this.squares);
    if (roads.length) {
      this.roads = roads;

      // Update road squares
      roads[1].concat(roads[2]).forEach((road) => {
        road.squares.forEach((coord) => {
          coord = atoi(coord);
          this.squares[coord[1]][coord[0]].setRoad(road);
        });
      });

      // Check current player first
      if (roads[this.player].length) {
        this.result = this.player === 1 ? "R-0" : "0-R";
      } else if (roads[this.player === 1 ? 2 : 1].length) {
        // Completed opponent's road
        this.result = this.player === 1 ? "0-R" : "R-0";
      }
      if (this.result) {
        this.isGameEnd = true;
      }
    } else if (
      this.pieces.played[this.player].flat.length +
        this.pieces.played[this.player].cap.length ===
        this.pieceCounts[this.player].total ||
      !this.squares.find((row) => row.find((square) => !square.pieces.length))
    ) {
      // Last empty square or last piece
      this.isGameEndFlats = true;
      if (this.flats[0] === this.flats[1]) {
        // Draw
        this.result = "1/2-1/2";
      } else if (this.flats[0] > this.flats[1]) {
        this.result = "F-0";
      } else {
        this.result = "0-F";
      }
      this.isGameEnd = true;
    }
  }

  getTPS() {
    const grid = this.squares
      .map((row) => {
        return row
          .map((square) => {
            if (square.pieces.length) {
              return square.pieces
                .map((piece) => piece.color + piece.typeCode())
                .join("");
            } else {
              return "x";
            }
          })
          .join(",");
      })
      .reverse()
      .join("/")
      .replace(/x((,x)+)/g, (spaces) => "x" + (1 + spaces.length) / 2);

    return `${grid} ${this.player} ${this.linenum}`;
  }

  doPly(ply) {
    if (!(ply instanceof Ply)) {
      ply = new Ply(ply);
      if (this.transform) {
        ply = ply.transform(this.size, this.transform);
      }
    }
    if (this.isGameEnd) {
      throw new Error("The game has ended");
    }
    if (ply.pieceCount > this.size) {
      throw new Error("Ply violates carry limit");
    }
    if (this.linenum === 1 && (ply.specialPiece || ply.movement)) {
      throw new Error("Invalid first move");
    }

    const stack = [];
    const moveset = ply.toMoveset();

    if (moveset[0].errors) {
      throw new Error(...moveset[0].errors);
    }

    for (let i = 0; i < moveset.length; i++) {
      const move = moveset[i];
      const action = move.action;
      const x = move.x;
      const y = move.y;
      const count = move.count || 1;
      const type = move.type;
      if (!this.squares[y] || !this.squares[y][x]) {
        throw new Error("Invalid move");
      }
      const square = this.squares[y][x];

      if (type) {
        if (action === "pop") {
          // Undo placement
          this.unplayPiece(square);
        } else {
          // Do placement
          if (square.piece) {
            throw new Error("Invalid move");
          }
          const piece = this.playPiece(
            this.options.opening === "swap" && this.linenum === 1
              ? this.player === 1
                ? 2
                : 1
              : this.player,
            type,
            square
          );
          if (!piece) {
            throw new Error("Invalid move");
          }
          piece.ply = ply;
        }
      } else if (action === "pop") {
        // Begin movement
        if (i === 0 && square.color !== this.player) {
          throw new Error("Invalid move");
        }
        times(count, () => {
          const piece = square.popPiece();
          if (!piece) {
            throw new Error("Invalid move");
          }
          stack.push(piece);
        });
      } else {
        // Continue movement
        if (square.pieces.length) {
          // Check that we can move onto existing piece(s)
          if (square.piece.isCapstone) {
            throw new Error("Invalid move");
          } else if (square.piece.isStanding) {
            if (
              stack[0].isCapstone &&
              count === 1 &&
              i === moveset.length - 1
            ) {
              // Smash
              square.piece.isStanding = false;
              square._setPiece(square.piece);
            } else {
              throw new Error("Invalid move");
            }
          }
        }

        times(count, () => {
          const piece = stack.pop();
          if (!piece) {
            throw new Error("Invalid move");
          }
          square.pushPiece(piece);
        });
      }
    }

    this.afterPly();

    this.player = this.player === 2 ? 1 : 2;
    this.linenum += Number(this.player === 1);

    return ply;
  }

  playPiece(color, type, square) {
    const isStanding = /S|wall/.test(type);
    if (!(type in this.pieceCounts[1])) {
      type = type === "C" ? "cap" : "flat";
    }
    const piece =
      this.pieces.all[color][type][this.pieces.played[color][type].length];
    if (piece) {
      piece.isStanding = isStanding;
      this.pieces.played[color][type].push(piece);
      square.pushPiece(piece);
      return piece;
    }
    return null;
  }

  unplayPiece(square) {
    const piece = square.popPiece();
    if (piece) {
      piece.isStanding = false;
      const pieces = this.pieces.played[piece.color][piece.type];
      if (piece.index !== pieces.length - 1) {
        // Swap indices with the top of the stack
        const lastPiece = pieces.pop();
        pieces.splice(piece.index, 1, lastPiece);
        [piece.index, lastPiece.index] = [lastPiece.index, piece.index];
        this.pieces.all[piece.color][piece.type][piece.index] = piece;
        this.pieces.all[piece.color][piece.type][lastPiece.index] = lastPiece;
      } else {
        this.pieces.played[piece.color][piece.type].pop();
      }
      return piece;
    }
    return null;
  }
};
