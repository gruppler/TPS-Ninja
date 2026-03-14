const { createCanvas } = require("canvas");
const { Board, parseTPS } = require("./Board");
const { Ply } = require("./Ply");
const { themes } = require("./themes");
const {
  isArray,
  isBoolean,
  isNumber,
  isString,
  last,
} = require("lodash");
const { pieceSizes, textSizes } = require("./drawUtils");
const { drawHeader } = require("./drawHeader");
const { drawAxisLabels, createSquareDrawer, drawUnplayedPieces } = require("./drawBoard");

const defaults = {
  imageSize: "md",
  textSize: "md",
  axisLabels: true,
  axisLabelsSmall: false,
  turnIndicator: true,
  flatCounts: true,
  stackCounts: true,
  komi: 0,
  moveNumber: true,
  evalText: true,
  opening: "swap",
  ply: "",
  plies: [],
  showRoads: true,
  unplayedPieces: true,
  padding: true,
  bgAlpha: 1,
  hlSquares: true,
  highlighter: null,
  transform: [0, 0],
  plyIsDone: true,
  font: "sans",
};

function sanitizeOptions(options) {
  for (let key in defaults) {
    if (options.hasOwnProperty(key)) {
      if (key === "highlighter" && isString(options[key])) {
        try {
          options[key] = JSON.parse(options[key]);
        } catch (err) {
          console.log(err);
          throw new Error("Invalid highlighter");
        }
      } else if (key === "moveNumber" && !isBoolean(options[key])) {
        const number = parseInt(options[key], 10);
        if (isNaN(number)) {
          options[key] !== "false";
        } else {
          options[key] = number;
        }
      } else if (key === "transform") {
        if (isString(options[key])) {
          try {
            options[key] = eval(options[key]);
          } catch (error) {
            options[key] = defaults[key];
          }
        }
        if (isArray(options[key])) {
          options[key] = options[key].slice(0, 2).map((n) => parseInt(n, 10));
          if (options[key].some((n) => isNaN(n))) {
            options[key] = defaults[key];
          }
        } else {
          options[key] = defaults[key];
        }
      } else if (key === "plies") {
        if (isString(options[key])) {
          options[key] = options[key].split(/[\s,]+/);
        }
      } else if (isBoolean(defaults[key])) {
        options[key] = options[key] !== false && options[key] !== "false";
      } else if (isNumber(defaults[key])) {
        options[key] = Number(options[key]);
      }
    } else {
      options[key] = defaults[key];
    }
  }
  if (isString(options.tps) && options.tps.length === 1) {
    options.tps = Number(options.tps);
  }
  return options;
}

exports.TPStoPNG = function (args) {
  const options = { tps: args[0] || "" };
  args.slice(1).forEach((arg) => {
    let [key, value] = arg.split("=");
    options[key] = value;
  });
  const canvas = exports.TPStoCanvas(options);

  let name = options.name || canvas.id.replace(/\//g, "-");
  if (!name.endsWith(".png")) {
    name += ".png";
  }
  const fs = require("fs");
  const out = fs.createWriteStream("./" + name);
  const stream = canvas.pngStream();
  stream.on("data", (chunk) => {
    out.write(chunk);
  });
};

exports.PTNtoTPS = function (args) {
  const options = { tps: args[0] || "" };
  const plies = [];
  args.slice(1).forEach((arg) => {
    let [key, value] = arg.split("=");
    if (value) {
      options[key] = value;
    } else {
      try {
        let ply = new Ply(key);
        if (ply) {
          plies.push(ply);
        }
      } catch (error) {}
    }
  });
  if (!plies.length) {
    throw new Error("No valid PTN provided");
  }
  const board = new Board(sanitizeOptions(options));
  plies.forEach((ply) => board.doPly(ply));
  return board.getTPS();
};

exports.parseTPS = parseTPS;

exports.parseTheme = function (theme) {
  if (!theme || !isString(theme)) {
    return theme || themes[0];
  }
  if (theme[0] === "{") {
    // Custom theme
    try {
      let parsedTheme = JSON.parse(theme);
      if (!parsedTheme.colors) {
        throw new Error("Missing theme colors");
      }
      let colors = Object.keys(parsedTheme.colors);
      if (
        Object.keys(themes[0].colors).some((color) => !colors.includes(color))
      ) {
        throw new Error("Missing theme colors");
      }
      if (theme.rings > 0) {
        if (theme.rings > 4) {
          throw new Error("Rings must not exceed 4");
        }
        for (let ring = 1; ring <= theme.rings; ring++) {
          if (!theme.colors[`ring${ring}`]) {
            throw new Error(
              `Expected ${theme.rings} ring(s) but found ${ring - 1}`
            );
          }
        }
      }
      return parsedTheme;
    } catch (err) {
      console.log(err);
      throw new Error("Invalid theme");
    }
  } else {
    // Built-in theme
    theme = themes.find((builtIn) => builtIn.id === theme);
    if (!theme) {
      throw new Error("Invalid theme ID");
    }
    return theme;
  }
};

exports.TPStoCanvas = function (options = {}) {
  sanitizeOptions(options);
  const theme = exports.parseTheme(options.theme);

  const board = new Board(options);
  if (!board || (board.errors && board.errors.length)) {
    throw new Error(board.errors[0]);
  }

  let hlSquares = [];
  let evalText = "";
  if (options.plies && options.plies.length) {
    const plies = options.plies.map((ply) => board.doPly(ply));
    let ply = last(plies);
    hlSquares = ply.squares;
    evalText = ply.evalText || "";
    options.plyIsDone = true;
  } else if (options.ply) {
    ply = board.doPly(options.ply);
    hlSquares = ply.squares;
    evalText = ply.evalText || "";
    options.plyIsDone = true;
  } else if (options.hl) {
    let ply = new Ply(options.hl);
    ply = ply.transform(board.size, options.transform);
    hlSquares = ply.squares;
  }

  // Dimensions
  const pieceSize = Math.round(
    (pieceSizes[options.imageSize] * 5) / board.size
  );
  const squareSize = pieceSize * 2;
  const roadSize = Math.round(squareSize * 0.3333);
  const pieceRadius = Math.round(squareSize * 0.05);
  const pieceSpacing = Math.round(squareSize * 0.07);
  const immovableSize = Math.round(squareSize * 0.15);
  const wallSize = Math.round(squareSize * 0.1875);
  const sideCoords = {
    N: [(squareSize - roadSize) / 2, 0],
    S: [(squareSize - roadSize) / 2, squareSize - roadSize],
    E: [squareSize - roadSize, (squareSize - roadSize) / 2],
    W: [0, (squareSize - roadSize) / 2],
  };

  const strokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.013
  );
  const shadowOffset = strokeWidth / 2 + Math.round(squareSize * 0.02);
  const shadowBlur = strokeWidth + Math.round(squareSize * 0.03);

  const fontSize = (squareSize * textSizes[options.textSize] * board.size) / 5;
  const stackCountFontSize = Math.min(squareSize * 0.18, fontSize);
  const padding = options.padding ? Math.round(fontSize * 0.5) : 0;

  const flatCounterHeight = options.turnIndicator
    ? Math.round(fontSize * 2)
    : 0;
  const turnIndicatorHeight = options.turnIndicator
    ? Math.round(fontSize * 0.5)
    : 0;
  const headerHeight = turnIndicatorHeight + flatCounterHeight;

  const axisSize =
    options.axisLabels && !options.axisLabelsSmall
      ? Math.round(fontSize * 1.5)
      : 0;

  const counterRadius = Math.round(flatCounterHeight / 4);
  const boardRadius = Math.round(squareSize / 10);
  const boardSize = squareSize * board.size;
  const unplayedWidth = options.unplayedPieces
    ? Math.round(squareSize * 1.75)
    : 0;

  const canvasWidth = unplayedWidth + axisSize + boardSize + padding * 2;
  const canvasHeight = headerHeight + axisSize + boardSize + padding * 2;

  const dims = {
    squareSize, pieceSize, pieceRadius, pieceSpacing, immovableSize, wallSize,
    roadSize, sideCoords, strokeWidth, shadowOffset, shadowBlur, fontSize,
    stackCountFontSize, padding, flatCounterHeight, turnIndicatorHeight,
    headerHeight, axisSize, counterRadius, boardRadius, boardSize,
    unplayedWidth, squareRadius: 0, squareMargin: 0,
  };

  // Board style
  switch (theme.boardStyle) {
    case "diamonds1":
      dims.squareRadius = squareSize * 0.1;
      break;
    case "diamonds2":
      dims.squareRadius = squareSize * 0.3;
      break;
    case "diamonds3":
      dims.squareRadius = squareSize * 0.5;
      break;
    case "grid1":
      dims.squareMargin = squareSize * 0.01;
      break;
    case "grid2":
      dims.squareMargin = squareSize * 0.03;
      dims.squareRadius = squareSize * 0.05;
      break;
    case "grid3":
      dims.squareMargin = squareSize * 0.06;
      dims.squareRadius = squareSize * 0.15;
  }

  // Start Drawing
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontSize}px ${options.font}`;
  ctx.textDrawingMode = "path";
  ctx.globalAlpha = options.bgAlpha;
  ctx.fillStyle = theme.colors.secondary;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.globalAlpha = 1;

  // Header
  if (options.turnIndicator) {
    options._evalText = evalText;
    drawHeader(ctx, options, board, theme, dims);
  }

  // Axis Labels
  let xAxis = [], yAxis = [];
  if (options.axisLabels) {
    ({ xAxis, yAxis } = drawAxisLabels(ctx, options, board, theme, dims));
  }

  // Board Squares & Pieces
  const { drawSquare, drawPiece } = createSquareDrawer(
    ctx, options, board, theme, hlSquares, xAxis, yAxis, dims
  );

  board.squares
    .concat()
    .reverse()
    .forEach((row) => row.forEach(drawSquare));

  // Unplayed Pieces
  if (options.unplayedPieces) {
    drawUnplayedPieces(ctx, options, board, theme, drawPiece, dims);
  }

  canvas.isGameEnd = board.isGameEnd;
  canvas.linenum = board.linenum;
  canvas.player = board.player;
  canvas.id = board.result || board.getTPS();
  return canvas;
};
