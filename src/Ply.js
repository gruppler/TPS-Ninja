const { atoi, itoa } = require("./Square");

const directionModifier = {
  "+": [0, 1],
  "-": [0, -1],
  ">": [1, 0],
  "<": [-1, 0],
};

exports.Ply = class {
  constructor(notation) {
    const matchData = notation.match(
      /(\d)?([CS])?([a-h])([1-8])(([<>+-])([1-8]+)?(\*)?)?/i
    );

    if (!matchData) {
      throw new Error("Invalid Ply");
    }

    [
      this.ptn,
      this.pieceCount,
      this.specialPiece,
      this.column,
      this.row,
      this.movement,
      this.direction,
      this.distribution,
      this.wallSmash,
    ] = matchData;

    if (this.specialPiece) {
      this.specialPiece = this.specialPiece.toUpperCase();
    }
    this.column = this.column.toLowerCase();
    this.specialPiece = this.specialPiece === "F" ? "" : this.specialPiece;
    this.pieceType = this.specialPiece === "C" ? "cap" : "flat";

    [this.x, this.y] = atoi(this.column + this.row);

    if (this.movement && !this.pieceCount) {
      this.pieceCount = String(1);
    }

    if (this.movement && !this.distribution) {
      this.distribution = String(this.pieceCount || 1);
    }
    this.squares = [this.column + this.row];

    if (this.movement) {
      const [xOffset, yOffset] = directionModifier[this.direction];
      let x = this.x;
      let y = this.y;
      this.stackDistribution = this.distribution.split("").map((drop) => {
        x += xOffset;
        y += yOffset;
        this.squares.push(itoa(x, y));
        return parseInt(drop, 10);
      });
    }
  }

  stackTotal() {
    if (!this.distribution) {
      return 1;
    }

    return this.distribution.split("").reduce((a, i) => a + parseInt(i, 10), 0);
  }

  isValidStackDistribution() {
    if (!this.pieceCount && !this.distribution) {
      return true;
    }

    return parseInt(this.pieceCount, 10) === this.stackTotal();
  }

  isValid() {
    this.errors = [];

    if (this.movement && !this.isValidStackDistribution()) {
      this.errors.push("Invalid stack distribution");
    }

    if (this.pieceCount > 1 && (!this.distribution || !this.direction)) {
      this.errors.push("Invalid movement: " + this.ptn);
    }

    return !this.errors.length;
  }

  toMoveset(reverse = false) {
    const types = { C: "cap", S: "wall", F: "flat" };

    if (!this.isValid()) {
      throw new Error(this.errors[0]);
    }

    if (!this.movement)
      return [
        {
          action: reverse ? "pop" : "push",
          x: this.x,
          y: this.y,
          type: types[this.specialPiece] || "flat",
        },
      ];

    const firstMove = {
      action: reverse ? "push" : "pop",
      count: parseInt(this.pieceCount, 10),
      x: this.x,
      y: this.y,
    };

    const [xOffset, yOffset] = directionModifier[this.direction];

    let moveSet = this.stackDistribution.map((n, i) => {
      return {
        action: reverse ? "pop" : "push",
        count: n,
        x: this.x + xOffset * (i + 1),
        y: this.y + yOffset * (i + 1),
      };
    });

    if (this.wallSmash) {
      moveSet[moveSet.length - 1].flatten = true;
    }

    return [firstMove, ...moveSet];
  }

  toUndoMoveset() {
    return this.toMoveset(true).reverse();
  }
};
