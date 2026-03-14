import fs from "fs";
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import { Board } from "./Board.js";
import { Ply } from "./Ply.js";
import themes, { computeThemeBooleans } from "./themes.js";
import {
  isArray,
  isBoolean,
  isFunction,
  isNumber,
  isString,
  last,
} from "lodash-es";
import { pieceSizes, textSizes } from "./drawUtils.js";
import { drawHeader } from "./drawHeader.js";
import { drawAxisLabels, createSquareDrawer, drawUnplayedPieces } from "./drawBoard.js";
import { drawAnalysis } from "./drawAnalysis.js";

export { parseTPS } from "./Board.js";

const defaults = {
  delay: 1000,
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
  tps: "",
  plies: [],
  showRoads: true,
  unplayedPieces: true,
  padding: true,
  bgAlpha: 1,
  transparent: false,
  hlSquares: true,
  highlighter: null,
  transform: [0, 0],
  plyIsDone: true,
  font: "sans",
  suggestions: null,
};

function sanitizeOptions(options) {
  for (const key in defaults) {
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
          options[key] = options[key] !== "false";
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
      } else if (key === "suggestions") {
        if (isString(options[key])) {
          try {
            options[key] = JSON.parse(options[key]);
          } catch (err) {
            options[key] = null;
          }
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
  if (options.size) {
    options.size = Number(options.size);
  }
  if (isString(options.tps) && options.tps && options.tps.length === 1) {
    options.tps = Number(options.tps);
  }
  return options;
}

export const TPStoPNG = function (args, streamTo = null) {
  let options;
  if (isArray(args)) {
    options = { tps: args[0] || "" };
    args.slice(1).forEach((arg) => {
      const [key, value] = arg.split("=");
      options[key] = value;
    });
  } else {
    options = args;
  }
  sanitizeOptions(options);

  const canvas = TPStoCanvas(options);

  if (isFunction(canvas.pngStream)) {
    const stream = canvas.pngStream();
    if (streamTo) {
      stream.pipe(streamTo);
    } else if (isFunction(fs.createWriteStream)) {
      let name = options.name || "takboard.png";
      if (!name.endsWith(".png")) {
        name += ".png";
      }
      const out = fs.createWriteStream("./" + name);
      stream.on("data", (chunk) => out.write(chunk));
    }
  }
  return canvas;
};

export const TPStoGIF = function (args, streamTo = null) {
  let options;
  if (isArray(args)) {
    options = { tps: args[0] || "" };
    args.slice(1).forEach((arg) => {
      const [key, value] = arg.split("=");
      options[key] = value;
    });
  } else {
    options = args;
  }
  sanitizeOptions(options);

  const plies = options.plies || [];
  if (plies.length) {
    delete options.plies;
    delete options.ply;
    delete options.hl;
  }

  let canvas = TPStoCanvas(options);
  let tps = canvas.tps;
  const encoder = new GIFEncoder(
    canvas.width,
    canvas.height,
    "neuquant",
    false,
    plies.length + 1
  );
  const stream = encoder.createReadStream();
  if (streamTo) {
    stream.pipe(streamTo);
  } else if (isFunction(fs.createWriteStream)) {
    let name = options.name || "takboard.gif";
    if (!name.endsWith(".gif")) {
      name += ".gif";
    }
    const out = fs.createWriteStream("./" + name);
    stream.pipe(out);
  }

  if (isFunction(options.onProgress)) {
    encoder.on("progress", options.onProgress);
  }

  encoder.setRepeat(0);
  if (options.transparent) {
    encoder.setTransparent();
  }
  encoder.setQuality(1);
  encoder.start();
  encoder.setDelay(options.delay);
  encoder.addFrame(canvas.ctx);
  while (plies.length) {
    options.tps = tps;
    options.ply = plies.shift();
    canvas = TPStoCanvas(options);
    tps = canvas.tps;
    encoder.setDelay(options.delay + options.delay * !plies.length);
    encoder.addFrame(canvas.ctx);
  }
  encoder.finish();
  return stream;
};

export const PTNtoTPS = function (args) {
  let options;
  let plies;
  if (isArray(args)) {
    plies = [];
    options = { tps: args[0] || "" };
    args.slice(1).forEach((arg) => {
      const [key, value] = arg.split("=");
      if (value) {
        options[key] = value;
      } else {
        try {
          const ply = new Ply(key);
          if (ply) {
            plies.push(ply);
          }
        } catch (error) {}
      }
    });
  } else {
    options = args;
    plies = options.plies;
  }
  sanitizeOptions(options);
  if (!plies.length) {
    throw new Error("No valid PTN provided");
  }
  const board = new Board(options);
  plies.forEach((ply) => board.doPly(ply));
  return board.getTPS();
};

export const parseTheme = function (theme) {
  if (!theme || !isString(theme)) {
    return computeThemeBooleans(theme || themes[0]);
  }
  if (theme[0] === "{") {
    // Custom theme
    try {
      const parsedTheme = JSON.parse(theme);
      if (!parsedTheme.colors) {
        throw new Error("Missing theme colors");
      }
      const colors = Object.keys(parsedTheme.colors);
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
      return computeThemeBooleans(parsedTheme);
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
    return computeThemeBooleans(theme);
  }
};

export const TPStoCanvas = function (options = {}) {
  sanitizeOptions(options);
  const theme = parseTheme(options.theme);

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
    const ply = board.doPly(options.ply);
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

  if (options.transparent) {
    options.bgAlpha = 0;
  }

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

  // Analysis Suggestions
  if (options.suggestions && isArray(options.suggestions)) {
    drawAnalysis(ctx, options, board, theme, dims);
  }

  // Unplayed Pieces
  if (options.unplayedPieces) {
    drawUnplayedPieces(ctx, options, board, theme, drawPiece, dims);
  }

  canvas.ctx = ctx;
  canvas.isGameEnd = board.isGameEnd;
  canvas.linenum = board.linenum;
  canvas.player = board.player;
  canvas.tps = board.getTPS();
  canvas.id = board.result || canvas.tps;
  return canvas;
};
