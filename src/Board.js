const { Square } = require("./Square");
const { Piece } = require("./Piece");
const { findRoads } = require("./Roads");
const { atoi } = require("./Square");

const { times } = require("lodash");

const pieceCounts = {
  3: { flat: 10, cap: 0 },
  4: { flat: 15, cap: 0 },
  5: { flat: 21, cap: 1 },
  6: { flat: 30, cap: 1 },
  7: { flat: 40, cap: 2 },
  8: { flat: 50, cap: 2 },
};

exports.Board = class {
  constructor(options) {
    this.options = options;
    this.errors = [];

    const matchData = options.tps.match(
      /(((x[1-8]?|[12]+[SC]?|,)+[\/-]?)+)\s+([12])\s+(\d+)/
    );

    if (!matchData) {
      this.errors.push("Invalid TPS notation");
      return;
    }

    [, this.grid, , , this.player, this.linenum] = matchData;

    this.grid = this.grid
      .replace(/x(\d)/g, (x, count) => {
        let spaces = ["x"];
        while (spaces.length < count) {
          spaces.push("x");
        }
        return spaces.join(",");
      })
      .split(/[\/-]/)
      .reverse()
      .map((row) => row.split(","));
    this.size = this.grid.length;
    this.player = Number(this.player);
    this.linenum = Number(this.linenum);

    if (this.grid.find((row) => row.length !== this.size)) {
      this.errors.push("Invalid TPS grid");
    }

    if (!(String(this.size) in pieceCounts)) {
      this.errors.push("Invalid board size");
    }

    // Set up piece counts
    this.pieceCounts = {
      1: { ...pieceCounts[this.size] },
      2: { ...pieceCounts[this.size] },
    };
    if (options.flats) {
      this.pieceCounts[1].flat = Number(options.flats);
      this.pieceCounts[2].flat = Number(options.flats);
    }
    if (options.caps) {
      this.pieceCounts[1].cap = Number(options.caps);
      this.pieceCounts[2].cap = Number(options.caps);
    }
    if (options.flats1) {
      this.pieceCounts[1].flat = Number(options.flats1);
    }
    if (options.caps1) {
      this.pieceCounts[1].cap = Number(options.caps1);
    }
    if (options.flats2) {
      this.pieceCounts[2].flat = Number(options.flats2);
    }
    if (options.caps2) {
      this.pieceCounts[2].cap = Number(options.caps2);
    }
    this.pieceCounts[1].total =
      this.pieceCounts[1].flat + this.pieceCounts[1].cap;
    this.pieceCounts[2].total =
      this.pieceCounts[2].flat + this.pieceCounts[2].cap;

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
    let stack, square, piece, type;
    this.grid.forEach((row, y) => {
      row.forEach((col, x) => {
        if (col[0] !== "x") {
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

    // Check for game end
    this.isGameEnd = false;
    this.result = "";
    const roads = findRoads(this.squares);
    if (roads) {
      // Update road squares
      roads[1].concat(roads[2]).forEach((road) => {
        road.squares.forEach((coord) => {
          coord = atoi(coord);
          this.squares[coord[1]][coord[0]].setRoad(road);
        });
      });

      // Check current player first
      if (roads[this.player].length) {
        this.result = this.player == 1 ? "R-0" : "0-R";
      } else if (roads[this.player == 1 ? 2 : 1].length) {
        // Completed opponent's road
        this.result = this.player == 1 ? "0-R" : "R-0";
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
      if (this.flats[0] == this.flats[1]) {
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
    let stack = [];
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
      let flatten = move.flatten;
      const type = move.type;
      if (!this.squares[y] || !this.squares[y][x]) {
        throw new Error("Invalid ply");
      }
      const square = this.squares[y][x];

      if (type) {
        if (action === "pop") {
          // Undo placement
          this.unplayPiece(square);
        } else {
          // Do placement
          if (!square.piece) {
            const piece = this.playPiece(
              this.linenum === 1 ? (this.player === 1 ? 2 : 1) : this.player,
              type,
              square
            );
            if (!piece) {
              throw new Error(`No ${type} stones remaining`);
            }
            piece.ply = ply;
          } else {
            throw new Error("Invalid ply");
          }
        }
      } else if (action === "pop") {
        // Undo movement
        if (i === 0 && square.color !== this.player) {
          throw new Error("Invalid ply");
        }
        times(count, () => stack.push(square.popPiece()));
        if (flatten && square.pieces.length) {
          square.piece.isStanding = true;
          square._setPiece(square.piece);
        }
      } else {
        // Do movement
        if (square.pieces.length) {
          if (
            square.piece.isCapstone ||
            (square.piece.isStanding && (!stack[0].isCapstone || count != 1 || i != moveset.length-1))
          ) {
            throw new Error("Invalid ply");
          }
        }
        // for foward play, sometimes the flatten marker is left off, so don't use it here
        if (square.pieces.length && stack[0].isCapstone && count == 1 && i == moveset.length-1) {
          square.piece.isStanding = false;
          square._setPiece(square.piece);
        }

        times(count, () => {
          let piece = stack.pop();
          if (!piece) {
            throw new Error("Invalid ply");
          }
          square.pushPiece(piece);
        });
      }
    }

    this.player = this.player === 2 ? 1 : 2;
    this.linenum += Number(this.player === 1);

    this.afterPly();
  }

  playPiece(color, type, square) {
    const isStanding = /S|wall/.test(type);
    if (!(type in this.pieceCounts[1])) {
      type = type === "C" ? "cap" : "flat";
    }
    const piece = this.pieces.all[color][type][
      this.pieces.played[color][type].length
    ];
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
