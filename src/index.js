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

export { parseTPS } from "./Board.js";

const pieceSizes = {
  xs: 12,
  sm: 24,
  md: 48,
  lg: 96,
  xl: 192,
};

const textSizes = {
  xs: 0.1875,
  sm: 0.21875,
  md: 0.25,
  lg: 0.3,
  xl: 0.4,
};

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
  const flats = board.flats.concat();
  const komi = options.komi;
  if (options.turnIndicator) {
    const totalFlats = flats[0] + flats[1];
    const flats1Width = Math.round(
      Math.min(
        boardSize - squareSize,
        Math.max(
          squareSize,
          (options.flatCounts && totalFlats ? flats[0] / totalFlats : 0.5) *
            boardSize
        )
      )
    );
    const flats2Width = Math.round(boardSize - flats1Width);
    const komiWidth = options.flatCounts
      ? Math.round(
          komi < 0
            ? flats1Width * (-komi / flats[0])
            : flats2Width * (komi / flats[1])
        )
      : 0;
    if (options.flatCounts) {
      if (komi < 0) {
        flats[0] =
          flats[0] + komi + " +" + (-komi).toString().replace(/0?\.5/, "½");
      } else if (komi > 0) {
        flats[1] =
          flats[1] - komi + " +" + komi.toString().replace(/0?\.5/, "½");
      }
    } else {
      flats[0] = "";
      flats[1] = "";
      if (komi < 0) {
        flats[0] = "+" + (-komi).toString().replace(/0?\.5/, "½");
      } else if (komi > 0) {
        flats[1] = "+" + komi.toString().replace(/0?\.5/, "½");
      }
    }

    // Flat Bars
    ctx.fillStyle = theme.colors.player1;
    roundRect(
      ctx,
      padding + axisSize,
      padding,
      flats1Width,
      flatCounterHeight,
      { tl: counterRadius }
    );
    ctx.fill();

    ctx.fillStyle = theme.colors.player2;
    roundRect(
      ctx,
      padding + axisSize + flats1Width,
      padding,
      flats2Width,
      flatCounterHeight,
      { tr: counterRadius }
    );
    ctx.fill();

    if (komiWidth) {
      const flatWidth = komi < 0 ? flats1Width : flats2Width;
      const dark = komi < 0 ? theme.player1Dark : theme.player2Dark;
      ctx.fillStyle = dark ? "#fff" : "#000";
      ctx.globalAlpha = 0.13;
      if (komiWidth >= flatWidth) {
        roundRect(
          ctx,
          padding + axisSize + (komi > 0) * flats1Width,
          padding,
          flatWidth,
          flatCounterHeight,
          { [komi < 0 ? "tl" : "tr"]: counterRadius }
        );
        ctx.fill();
      } else {
        ctx.fillRect(
          padding + axisSize + flats1Width - (komi < 0) * komiWidth,
          padding,
          komiWidth,
          flatCounterHeight
        );
      }
      ctx.globalAlpha = 1;
    }

    // Flat Counts
    ctx.fillStyle = theme.player1Dark
      ? theme.colors.textLight
      : theme.colors.textDark;
    ctx.textBaseline = "middle";
    // Player 1 Name
    if (options.player1) {
      ctx.textDrawingMode = "glyph";
      const flatCount1Width = ctx.measureText(flats[0]).width;
      const player1 = limitText(
        ctx,
        options.player1,
        flats1Width - flatCount1Width - fontSize * 1.2
      );
      ctx.textAlign = "start";
      ctx.fillText(
        player1,
        padding + axisSize + fontSize / 2,
        padding + flatCounterHeight / 2
      );
      ctx.textDrawingMode = "path";
    }
    // Player 1 Flat Count
    if (flats[0] !== "") {
      ctx.textAlign = "end";
      flats[0] = String(flats[0]).split(" ");
      ctx.fillText(
        flats[0][0],
        padding + axisSize + flats1Width - fontSize / 2,
        padding + flatCounterHeight / 2
      );
      if (flats[0][1]) {
        // Komi
        flats[0][1] = flats[0][1].substring(1) + "+";
        ctx.globalAlpha = 0.5;
        ctx.fillText(
          flats[0][1],
          padding +
            axisSize +
            flats1Width -
            fontSize / 2 -
            ctx.measureText(flats[0][0] + " ").width,
          padding + flatCounterHeight / 2
        );
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = theme.player2Dark
      ? theme.colors.textLight
      : theme.colors.textDark;

    // Player 2 Name
    if (options.player2) {
      ctx.textDrawingMode = "glyph";
      const flatCount2Width = ctx.measureText(flats[1]).width;
      const player2 = limitText(
        ctx,
        options.player2,
        flats2Width - flatCount2Width - fontSize * 1.2
      );
      ctx.textAlign = "end";
      ctx.fillText(
        player2,
        padding + axisSize + boardSize - fontSize / 2,
        padding + flatCounterHeight / 2
      );
      ctx.textDrawingMode = "path";
    }
    // Player 2 Flat Count
    if (flats[1] !== "") {
      ctx.textAlign = "start";
      flats[1] = String(flats[1]).split(" ");
      ctx.fillText(
        flats[1][0],
        padding + axisSize + flats1Width + fontSize / 2,
        padding + flatCounterHeight / 2
      );
      if (flats[1][1]) {
        // Komi
        ctx.globalAlpha = 0.5;
        ctx.fillText(
          flats[1][1],
          padding +
            axisSize +
            flats1Width +
            fontSize / 2 +
            ctx.measureText(flats[1][0] + " ").width,
          padding + flatCounterHeight / 2
        );
        ctx.globalAlpha = 1;
      }
    }

    // Turn Indicator
    if (!board.isGameEnd) {
      ctx.fillStyle = theme.colors.primary;
      ctx.fillRect(
        padding + axisSize + (board.player === 1 ? 0 : boardSize / 2),
        padding + flatCounterHeight,
        boardSize / 2,
        turnIndicatorHeight
      );
    }

    // Move number
    let moveNumberWidth = 0;
    if (options.moveNumber && options.unplayedPieces) {
      let moveNumber;
      if (typeof options.moveNumber === "number") {
        moveNumber = options.moveNumber;
      } else {
        moveNumber = board.linenum;
        if (moveNumber > 1 && board.player === 1) {
          moveNumber -= 1;
        }
      }
      moveNumber += ".";
      ctx.save();
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.shadowBlur = fontSize * 0.1;
      ctx.shadowColor =
        theme.secondaryDark || options.bgAlpha < 0.5
          ? theme.colors.textDark
          : theme.colors.textLight;
      ctx.fillStyle =
        theme.secondaryDark || options.bgAlpha < 0.5
          ? theme.colors.textLight
          : theme.colors.textDark;
      ctx.fillText(
        moveNumber,
        padding + axisSize + boardSize + unplayedWidth / 2,
        padding + flatCounterHeight / 2
      );
      let { width } = ctx.measureText(moveNumber);
      moveNumberWidth = width;
      ctx.restore();
    }

    if (options.evalText && options.unplayedPieces && evalText) {
      if (moveNumberWidth) {
        evalText = " " + evalText;
      }
      ctx.save();
      ctx.textBaseline = "middle";
      ctx.textAlign = options.moveNumber ? "left" : "center";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.shadowBlur = fontSize * 0.1;
      ctx.shadowColor =
        theme.secondaryDark || options.bgAlpha < 0.5
          ? theme.colors.textDark
          : theme.colors.textLight;
      ctx.fillStyle = theme.colors.primary;
      ctx.font = `bold ${fontSize}px ${options.font}`;
      ctx.fillText(
        evalText,
        padding +
          axisSize +
          boardSize +
          unplayedWidth / 2 +
          moveNumberWidth / 2,
        padding + flatCounterHeight / 2
      );
      ctx.restore();
    }
  }

  // Axis Labels
  let xAxis, yAxis;
  if (options.axisLabels) {
    let cols = "abcdefgh".substring(0, board.size).split("");
    let rows = "12345678".substring(0, board.size).split("");
    yAxis = options.transform[0] % 2 ? cols : rows;
    if (options.transform[0] === 1 || options.transform[0] === 2) {
      yAxis.reverse();
    }
    xAxis = options.transform[0] % 2 ? rows : cols;
    if (
      options.transform[1]
        ? options.transform[0] === 0 || options.transform[0] === 1
        : options.transform[0] === 2 || options.transform[0] === 3
    ) {
      xAxis.reverse();
    }

    // Draw large axis labels
    if (!options.axisLabelsSmall) {
      ctx.save();
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.shadowBlur = fontSize * 0.1;
      ctx.shadowColor =
        theme.secondaryDark || options.bgAlpha < 0.5
          ? theme.colors.textDark
          : theme.colors.textLight;
      ctx.fillStyle =
        theme.secondaryDark || options.bgAlpha < 0.5
          ? theme.colors.textLight
          : theme.colors.textDark;
      for (let i = 0; i < board.size; i++) {
        const coord = [xAxis[i], yAxis[i]];
        ctx.textBaseline = padding ? "middle" : "bottom";
        ctx.textAlign = "center";
        ctx.fillText(
          coord[0],
          padding + axisSize + squareSize * i + squareSize / 2,
          padding +
            headerHeight +
            boardSize +
            (padding ? (axisSize + padding) / 2 : axisSize)
        );
        ctx.textBaseline = "middle";
        ctx.textAlign = padding ? "center" : "left";
        ctx.fillText(
          coord[1],
          padding ? (axisSize + padding) / 2 : 0,
          padding +
            headerHeight +
            squareSize * (board.size - i - 1) +
            squareSize / 2
        );
      }
      ctx.restore();
    }
  }

  // Board
  let squareRadius = 0;
  let squareMargin = 0;
  switch (theme.boardStyle) {
    case "diamonds1":
      squareRadius = squareSize * 0.1;
      break;
    case "diamonds2":
      squareRadius = squareSize * 0.3;
      break;
    case "diamonds3":
      squareRadius = squareSize * 0.5;
      break;
    case "grid1":
      squareMargin = squareSize * 0.01;
      break;
    case "grid2":
      squareMargin = squareSize * 0.03;
      squareRadius = squareSize * 0.05;
      break;
    case "grid3":
      squareMargin = squareSize * 0.06;
      squareRadius = squareSize * 0.15;
  }

  // Square
  const drawSquareHighlight = () => {
    const half = squareSize / 2;
    if (squareRadius >= half) {
      ctx.beginPath();
      ctx.arc(half, half, half, 0, 2 * Math.PI);
      ctx.closePath();
    } else {
      roundRect(
        ctx,
        squareMargin,
        squareMargin,
        squareSize - squareMargin * 2,
        squareSize - squareMargin * 2,
        squareRadius
      );
    }
    ctx.fill();
  };

  const drawSquareNumber = (square, text, corner = "br") => {
    const isDark = theme.boardChecker && !square.isLight;
    ctx.save();
    ctx.font = `${stackCountFontSize}px ${options.font}`;
    let isTextLight = theme.board2Dark;
    ctx.fillStyle = theme.colors.board2;
    if (hlSquares.includes(square.coord)) {
      isTextLight = theme.primaryDark;
      ctx.fillStyle = theme.colors.primary;
    } else if (isDark) {
      isTextLight = theme.board1Dark;
      ctx.fillStyle = theme.colors.board1;
    }
    let radius = (stackCountFontSize * 1.5) / 2;
    ctx.beginPath();
    ctx.arc(
      corner[1] === "r" ? squareSize - radius : radius,
      corner[0] === "b" ? squareSize - radius : radius,
      radius,
      0,
      2 * Math.PI
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isTextLight
      ? theme.colors.textLight
      : theme.colors.textDark;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(
      text,
      corner[1] === "r" ? squareSize - radius : radius,
      corner[0] === "b" ? squareSize - radius * 0.95 : radius * 0.95
    );
    ctx.restore();
  };

  const drawSquare = (square) => {
    const isDark = theme.boardChecker && !square.isLight;
    ctx.save();
    ctx.translate(
      padding + axisSize + square.x * squareSize,
      padding + headerHeight + (board.size - square.y - 1) * squareSize
    );

    if (!theme.boardStyle || theme.boardStyle === "blank") {
      ctx.fillStyle = theme.colors["board" + (isDark ? 2 : 1)];
      ctx.fillRect(0, 0, squareSize, squareSize);
    } else {
      ctx.fillStyle = theme.colors["board" + (isDark ? 1 : 2)];
      ctx.fillRect(0, 0, squareSize, squareSize);
      ctx.fillStyle = theme.colors["board" + (isDark ? 2 : 1)];
      drawSquareHighlight();
    }

    if (theme.rings) {
      let ring = square.ring;
      if (theme.fromCenter) {
        ring = Math.round(board.size / 2) - ring + 1;
      }
      if (ring <= theme.rings) {
        ctx.fillStyle = theme.colors["ring" + ring];
        ctx.globalAlpha = theme.vars["rings-opacity"];
        drawSquareHighlight();
        ctx.globalAlpha = 1;
      }
    }

    if (options.highlighter && square.coord in options.highlighter) {
      ctx.fillStyle = withAlpha(options.highlighter[square.coord], 0.75);
      drawSquareHighlight();
    } else if (options.hlSquares && hlSquares.includes(square.coord)) {
      const alphas = [0.4, 0.75];
      if (!options.plyIsDone) {
        alphas.reverse();
      }
      ctx.fillStyle = withAlpha(
        theme.colors.primary,
        hlSquares.length > 1 && square.coord === hlSquares[0]
          ? alphas[0]
          : alphas[1]
      );
      drawSquareHighlight();
    }

    if (options.showRoads && square.connected.length && !board.isGameEndFlats) {
      square.connected.forEach((side) => {
        const coords = sideCoords[side];
        ctx.fillStyle = withAlpha(
          theme.colors[`player${square.color}road`],
          square.roads[side] ? 0.8 : 0.2
        );
        ctx.fillRect(coords[0], coords[1], roadSize, roadSize);
      });
      ctx.fillStyle = withAlpha(
        theme.colors[`player${square.color}road`],
        square.roads.length ? 0.8 : 0.2
      );
      ctx.fillRect(
        (squareSize - roadSize) / 2,
        (squareSize - roadSize) / 2,
        roadSize,
        roadSize
      );
    } else if (square.roads.length) {
      ctx.fillStyle = withAlpha(
        theme.colors[`player${square.color}road`],
        0.35
      );
      drawSquareHighlight();
    }

    // Small Axis Labels
    if (options.axisLabels && options.axisLabelsSmall) {
      let col = xAxis[square.x];
      let row = yAxis[square.y];
      if (options.transform[0] % 2) {
        [col, row] = [row, col];
      }
      if (square.edges.W) {
        drawSquareNumber(square, row, "tl");
      }
      if (square.edges.S) {
        drawSquareNumber(square, col, "br");
      }
    }

    if (square.piece) {
      if (board.isGameEndFlats && !square.piece.typeCode()) {
        ctx.fillStyle = withAlpha(
          theme.colors[`player${square.color}road`],
          0.4
        );
        drawSquareHighlight();
      }

      // Stack Count
      if (options.stackCounts && square.pieces.length > 1) {
        drawSquareNumber(square, square.pieces.length, "bl");
      }

      square.pieces.forEach(drawPiece);
    }

    ctx.restore();
  };

  // Piece
  const drawPiece = (piece) => {
    ctx.save();

    const pieces = piece.square ? piece.square.pieces : null;
    const offset = squareSize / 2;
    ctx.translate(offset, offset);

    let y = 0;
    const z = piece.z();
    const isOverLimit = pieces && pieces.length > board.size;
    const isImmovable = isOverLimit && z < pieces.length - board.size;

    if (piece.square) {
      // Played
      y -= pieceSpacing * z;
      if (isOverLimit && !isImmovable) {
        y += pieceSpacing * (pieces.length - board.size);
      }
      if (piece.isStanding && pieces.length > 1) {
        y += pieceSpacing;
      }
      const overflow = Math.max(0, pieces.length - 10 - board.size);
      if (isImmovable) {
        if (z < overflow) {
          ctx.restore();
          return;
        }
        y += pieceSpacing * overflow;
      }
    } else {
      // Unplayed
      const stackColor =
        options.opening === "swap" && piece.index === 0 && !piece.isCapstone
          ? piece.color === 1
            ? 2
            : 1
          : piece.color;
      const caps = board.pieceCounts[stackColor].cap;
      const total = board.pieceCounts[stackColor].total;
      y = board.size - 1;
      if (piece.isCapstone) {
        y *= total - piece.index - 1;
      } else {
        y *= total - piece.index - caps - 1;
      }
      y *= -squareSize / (total - 1);
    }

    y = Math.round(y);

    if (piece.isCapstone) {
      ctx.fillStyle = theme.colors[`player${piece.color}special`];
      ctx.beginPath();
      ctx.arc(0, y, pieceSize / 2, 0, 2 * Math.PI);
    } else if (piece.isStanding) {
      ctx.fillStyle = theme.colors[`player${piece.color}special`];
      ctx.translate(0, y);
      ctx.rotate(((piece.color === 1 ? -45 : 45) * Math.PI) / 180);
      roundRect(
        ctx,
        Math.round(-wallSize / 2),
        Math.round(-pieceSize / 2),
        wallSize,
        pieceSize,
        pieceRadius
      );
    } else {
      ctx.fillStyle = theme.colors[`player${piece.color}flat`];
      if (isImmovable) {
        roundRect(
          ctx,
          Math.round(pieceSize / 2),
          Math.round(y + pieceSize / 2 - pieceSpacing),
          immovableSize,
          pieceSpacing,
          pieceRadius / 2
        );
      } else {
        roundRect(
          ctx,
          Math.round(-pieceSize / 2),
          Math.round(y - pieceSize / 2),
          pieceSize,
          pieceSize,
          pieceRadius
        );
      }
    }

    // Fill
    ctx.save();
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffset;
    ctx.shadowColor = theme.colors.umbra;
    ctx.fill();
    ctx.restore();

    // Stroke
    if (theme.vars["piece-border-width"] > 0) {
      ctx.strokeStyle = theme.colors[`player${piece.color}border`];
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    ctx.restore();
  };

  board.squares
    .concat()
    .reverse()
    .forEach((row) => row.forEach(drawSquare));

  // Analysis Suggestions
  if (options.suggestions && isArray(options.suggestions)) {
    drawAnalysis(
      ctx,
      options,
      board,
      theme,
      squareSize,
      pieceSize,
      pieceRadius,
      strokeWidth,
      padding,
      axisSize,
      headerHeight
    );
  }

  // Unplayed Pieces
  if (options.unplayedPieces) {
    ctx.fillStyle = theme.colors.board3;
    roundRect(
      ctx,
      axisSize + padding + boardSize,
      headerHeight + padding,
      unplayedWidth,
      boardSize,
      { tr: boardRadius, br: boardRadius }
    );
    ctx.fill();

    [1, 2].forEach((color) => {
      ctx.save();
      ctx.translate(
        padding + axisSize + boardSize + (color === 2) * squareSize * 0.75,
        padding + headerHeight + boardSize - squareSize
      );
      ["flat", "cap"].forEach((type) => {
        const total = board.pieceCounts[color][type];
        const played = board.pieces.played[color][type].length;
        const remaining = total - played;
        const pieces = board.pieces.all[color][type].slice(total - remaining);
        if (type === "flat" && options.opening === "swap") {
          // Swap first pieces
          if (color === 1) {
            if (!board.pieces.played[2][type].length) {
              pieces[0] = board.pieces.all[2][type][0];
            } else if (!played) {
              pieces.shift();
            }
          } else if (!board.pieces.played[1][type].length) {
            if (!board.pieces.played[2][type].length) {
              pieces[0] = board.pieces.all[1][type][0];
            } else {
              pieces.unshift(board.pieces.all[1][type][0]);
            }
          }
        }
        pieces.reverse().forEach(drawPiece);
      });
      ctx.restore();
    });
  }

  canvas.ctx = ctx;
  canvas.isGameEnd = board.isGameEnd;
  canvas.linenum = board.linenum;
  canvas.player = board.player;
  canvas.tps = board.getTPS();
  canvas.id = board.result || canvas.tps;
  return canvas;
};

function withAlpha(color, alpha) {
  return color.substring(0, 7) + Math.round(256 * alpha).toString(16);
}

function limitText(ctx, text, width) {
  const suffix = "…";
  if (width <= 0) {
    return "";
  }
  if (width >= ctx.measureText(text).width) {
    return text;
  }
  do {
    text = text.substring(0, text.length - 1);
  } while (text.length && ctx.measureText(text + suffix).width >= width);
  return text + suffix;
}

function drawAnalysis(
  ctx,
  options,
  board,
  theme,
  squareSize,
  pieceSize,
  pieceRadius,
  strokeWidth,
  padding,
  axisSize,
  headerHeight
) {
  const suggestions = options.suggestions;
  if (!suggestions || !suggestions.length) return;

  const size = board.size;
  const transform = options.transform || [0, 0];

  // Parse suggestions into move objects
  const moves = [];
  for (const s of suggestions) {
    try {
      let ply;
      if (isString(s)) {
        ply = new Ply(s);
      } else if (isString(s.ptn)) {
        ply = new Ply(s.ptn);
      } else if (s.ply) {
        ply = isString(s.ply) ? new Ply(s.ply) : s.ply;
      } else {
        continue;
      }
      if (transform[0] || transform[1]) {
        ply = ply.transform(size, transform);
      }
      moves.push({
        ply,
        evaluation: s.evaluation != null ? s.evaluation : null,
        nodes: s.nodes != null ? s.nodes : null,
        depth: s.depth != null ? s.depth : null,
        totalGames: s.totalGames != null ? s.totalGames : null,
        wins1: s.wins1 != null ? s.wins1 : null,
        wins2: s.wins2 != null ? s.wins2 : null,
        draws: s.draws != null ? s.draws : null,
      });
    } catch (e) {
      // Skip invalid plies
    }
  }

  if (!moves.length) return;

  // Deduplicate by ply text, keeping the superior result
  const seen = {};
  const deduped = [];
  for (const m of moves) {
    const key = m.ply.ptn.replace(/[?!'"]+$/, "");
    if (key in seen) {
      const existing = deduped[seen[key]];
      if (isSuperior(m, existing)) {
        deduped[seen[key]] = m;
      }
    } else {
      seen[key] = deduped.length;
      deduped.push(m);
    }
  }

  // Compute strengths (opacity)
  const strengths = computeStrengths(deduped, board.player);

  // Coordinate conversion: board coord string -> canvas pixel center
  function coordToCanvas(coord) {
    const bx = "abcdefgh".indexOf(coord[0]);
    const by = parseInt(coord.slice(1), 10) - 1;
    const t = transform;
    const s = size;

    let row, col;
    if (t[0] % 2) {
      row = bx;
      col = by;
    } else {
      row = by;
      col = bx;
    }
    if (t[0] === 1 || t[0] === 2) {
      row = s - 1 - row;
    }
    const rotation = (t[0] + 2 * t[1]) % 4;
    if (rotation === 2 || rotation === 3) {
      col = s - 1 - col;
    }

    return {
      x: padding + axisSize + col * squareSize + squareSize / 2,
      y: padding + headerHeight + (s - 1 - row) * squareSize + squareSize / 2,
    };
  }

  // Get stack height at a board coordinate
  function getStackHeight(coord) {
    const bx = "abcdefgh".indexOf(coord[0]);
    const by = parseInt(coord.slice(1), 10) - 1;
    if (
      bx >= 0 &&
      bx < size &&
      by >= 0 &&
      by < size &&
      board.squares[by] &&
      board.squares[by][bx]
    ) {
      return board.squares[by][bx].pieces.length;
    }
    return 0;
  }

  const ghostStrokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.013 * 0.5
  );

  // Draw placement ghost stones
  const placements = [];
  const arrows = [];
  deduped.forEach((m, i) => {
    if (m.ply.movement) {
      arrows.push({ move: m, strength: strengths[i] });
    } else {
      placements.push({ move: m, strength: strengths[i] });
    }
  });

  // Group placements by target square
  const placementGroups = {};
  placements.forEach((p) => {
    const coord = p.move.ply.column + p.move.ply.row;
    if (!placementGroups[coord]) placementGroups[coord] = [];
    placementGroups[coord].push(p);
  });

  for (const coord in placementGroups) {
    const group = placementGroups[coord];
    const center = coordToCanvas(coord);
    const offsets = getGroupOffsets(group.length, squareSize);
    const scale = 0.75;
    const ghostStrokeScaled = Math.round(ghostStrokeWidth * scale);

    group.forEach((p, i) => {
      const cx = center.x + offsets[i].dx;
      const cy = center.y + offsets[i].dy;

      // Determine color: first move of game uses swap
      const plyColor =
        board.linenum === 1 && options.opening === "swap"
          ? board.player === 1
            ? 2
            : 1
          : board.player;

      ctx.save();
      ctx.globalAlpha = p.strength;

      if (p.move.ply.specialPiece === "C") {
        // Capstone — match HTML: r = 0.17 * scale (in square units)
        const r = Math.round(squareSize * 0.17 * scale);
        ctx.fillStyle = theme.colors[`player${plyColor}special`];
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
      } else if (p.move.ply.specialPiece === "S") {
        // Wall — match HTML: w = 0.1 * scale, h = 0.35 * scale
        const w = Math.round(squareSize * 0.1 * scale);
        const h = Math.round(squareSize * 0.35 * scale);
        const wallRx = Math.round(w * 0.15);
        ctx.fillStyle = theme.colors[`player${plyColor}special`];
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((plyColor === 1 ? -45 : 45) * Math.PI) / 180);
        roundRect(
          ctx,
          Math.round(-w / 2),
          Math.round(-h / 2),
          w,
          h,
          wallRx
        );
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Flat — match HTML: sz = 0.35 * scale, rx = sz * 0.12
        const sz = Math.round(squareSize * 0.35 * scale);
        const flatRx = Math.round(sz * 0.12);
        ctx.fillStyle = theme.colors[`player${plyColor}flat`];
        roundRect(
          ctx,
          Math.round(cx - sz / 2),
          Math.round(cy - sz / 2),
          sz,
          sz,
          flatRx
        );
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  // Group arrows that share any edge (segment between adjacent squares)
  // in the same direction, so they can be offset perpendicularly.
  const arrowGroupMap = groupOverlappingArrows(arrows);

  // Draw movement arrows
  // Use an offscreen canvas per arrow so overlapping elements (line, head,
  // drop circles) composite at full opacity, then blit with group alpha.
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  arrows.forEach(({ move, strength }) => {
    const ply = move.ply;
    const squares = ply.squares;
    if (!squares || squares.length < 2) return;

    const from = coordToCanvas(squares[0]);
    const to = coordToCanvas(squares[squares.length - 1]);
    const plyColor = board.player;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const ndx = dx / len;
    const ndy = dy / len;
    const px = -ndy;
    const py = ndx;

    // Perpendicular offset for overlapping arrows
    const groupInfo = arrowGroupMap.get(move);
    let perpOffset = 0;
    if (groupInfo && groupInfo.groupSize > 1) {
      const spacing = squareSize * 0.22;
      perpOffset =
        (-(groupInfo.groupSize - 1) / 2 + groupInfo.index) * spacing;
    }
    const ox = px * perpOffset;
    const oy = py * perpOffset;

    const startShorten = squareSize * 0.3;
    const endShorten = squareSize * 0.15;
    const headLen = squareSize * 0.2;
    const headHalf = squareSize * 0.1;
    const lineWidth = squareSize * 0.08;

    const tipX = to.x - ndx * endShorten + ox;
    const tipY = to.y - ndy * endShorten + oy;
    const baseX = tipX - ndx * headLen;
    const baseY = tipY - ndy * headLen;

    const x1 = from.x + ndx * startShorten + ox;
    const y1 = from.y + ndy * startShorten + oy;

    const lx = baseX + px * headHalf;
    const ly = baseY + py * headHalf;
    const rx = baseX - px * headHalf;
    const ry = baseY - py * headHalf;

    const arrowColor = theme.colors[`player${plyColor}flat`];
    const textColor = theme[`player${plyColor}FlatDark`]
      ? theme.colors.textLight
      : theme.colors.textDark;

    // Draw arrow elements to offscreen canvas at full opacity
    const offscreen = createCanvas(canvasW, canvasH);
    const octx = offscreen.getContext("2d");

    // Draw line
    octx.strokeStyle = arrowColor;
    octx.lineWidth = lineWidth;
    octx.lineCap = "round";
    octx.beginPath();
    octx.moveTo(x1, y1);
    octx.lineTo(baseX, baseY);
    octx.stroke();

    // Draw arrowhead
    octx.fillStyle = arrowColor;
    octx.beginPath();
    octx.moveTo(tipX, tipY);
    octx.lineTo(lx, ly);
    octx.lineTo(rx, ry);
    octx.closePath();
    octx.fill();

    // Drop count indicators
    const dist = ply.distribution;
    const pickup = parseInt(ply.pieceCount, 10) || 1;
    const isWholeStack = dist && dist.length === 1;
    const dropR = squareSize * 0.08;
    const dropFontSize = Math.round(squareSize * 0.1);

    if (dist && squares.length > 1) {
      const sourceHeight = getStackHeight(squares[0]);
      const showPickup = pickup > 1 || sourceHeight > 1;

      // Pickup arrowhead background
      const pCx = x1 + ndx * squareSize * 0.03;
      const pCy = y1 + ndy * squareSize * 0.03;
      const pLen = squareSize * 0.2;
      const pHalf = squareSize * 0.1;
      const pTipX = pCx + ndx * pLen * 0.6;
      const pTipY = pCy + ndy * pLen * 0.6;
      const pBackX = pCx - ndx * pLen * 0.4;
      const pBackY = pCy - ndy * pLen * 0.4;
      const plx2 = pBackX + px * pHalf;
      const ply2 = pBackY + py * pHalf;
      const prx2 = pBackX - px * pHalf;
      const pry2 = pBackY - py * pHalf;

      // Draw pickup arrowhead shape
      octx.fillStyle = arrowColor;
      octx.beginPath();
      octx.moveTo(pTipX, pTipY);
      octx.lineTo(plx2, ply2);
      octx.lineTo(prx2, pry2);
      octx.closePath();
      octx.fill();

      // Pickup count text
      if (showPickup) {
        const tCx = pBackX + (pTipX - pBackX) * 0.3;
        const tCy = pBackY + (pTipY - pBackY) * 0.3;
        octx.fillStyle = textColor;
        octx.font = `${dropFontSize}px ${options.font}`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(String(pickup), tCx, tCy);
      }

      if (!isWholeStack) {
        // Intermediate drop counts
        for (let si = 1; si < squares.length - 1; si++) {
          const count = parseInt(dist[si - 1], 10);
          if (isNaN(count)) continue;
          const sq = coordToCanvas(squares[si]);
          const sqToX1x = sq.x - from.x;
          const sqToX1y = sq.y - from.y;
          const proj = sqToX1x * ndx + sqToX1y * ndy;
          const dropCx = from.x + ndx * proj + ox;
          const dropCy = from.y + ndy * proj + oy;

          // Circle background
          octx.fillStyle = arrowColor;
          octx.beginPath();
          octx.arc(dropCx, dropCy, dropR, 0, 2 * Math.PI);
          octx.closePath();
          octx.fill();

          // Count text
          octx.fillStyle = textColor;
          octx.font = `${dropFontSize}px ${options.font}`;
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillText(String(count), dropCx, dropCy);
        }

        // Final drop count inside arrowhead
        const lastCount = parseInt(dist[dist.length - 1], 10);
        if (!isNaN(lastCount)) {
          const hcx = baseX + (tipX - baseX) * 0.3;
          const hcy = baseY + (tipY - baseY) * 0.3;
          octx.fillStyle = textColor;
          octx.font = `${dropFontSize}px ${options.font}`;
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillText(String(lastCount), hcx, hcy);
        }
      }
    }

    // Composite the offscreen arrow onto the main canvas with group opacity
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  });
}

function isSuperior(candidate, existing) {
  const cNodes = candidate.nodes != null ? candidate.nodes : null;
  const eNodes = existing.nodes != null ? existing.nodes : null;
  const cDepth = candidate.depth != null ? candidate.depth : null;
  const eDepth = existing.depth != null ? existing.depth : null;

  if (cNodes !== null && eNodes !== null && cNodes !== eNodes) {
    return cNodes > eNodes;
  }
  if (cDepth !== null && eDepth !== null && cDepth !== eDepth) {
    return cDepth > eDepth;
  }

  const cEval =
    candidate.evaluation != null ? Math.abs(candidate.evaluation) : null;
  const eEval =
    existing.evaluation != null ? Math.abs(existing.evaluation) : null;
  if (cEval !== null && eEval !== null) {
    return cEval > eEval;
  }
  return false;
}

function computeStrengths(moves, currentPlayer) {
  const DEFAULT_OPACITY = 1.0;
  const MIN_OPACITY = 0.25;

  if (moves.length === 0) return [];
  if (moves.length === 1) return [DEFAULT_OPACITY];

  // Convert to subjective eval on 0-200 scale where higher = better for current player.
  // Engine eval: white → 100 + eval, black → 100 - eval
  // Openings win rate (0-1 from current player's POV) → winRate * 200
  const hasOpenings = moves.some((m) => m.totalGames != null && m.totalGames > 0);

  const subjEvals = moves.map((m) => {
    if (hasOpenings) {
      if (!m.totalGames || m.totalGames === 0) return 100;
      const wins = currentPlayer === 1 ? m.wins1 : m.wins2;
      const draws = m.draws || 0;
      return ((wins + draws * 0.5) / m.totalGames) * 200;
    } else {
      if (m.evaluation === null || m.evaluation === undefined) return null;
      return currentPlayer === 1 ? 100 + m.evaluation : 100 - m.evaluation;
    }
  });

  // Top suggestion (index 0) always gets DEFAULT_OPACITY.
  // Others scale relative to the top suggestion's subjective eval.
  const topEval = subjEvals[0];
  if (topEval === null || topEval === 0) {
    return moves.map(() => DEFAULT_OPACITY);
  }

  return subjEvals.map((e, i) => {
    if (i === 0) return DEFAULT_OPACITY;
    if (e === null) return MIN_OPACITY;
    return Math.max(MIN_OPACITY, DEFAULT_OPACITY * (e / topEval));
  });
}

// Groups arrows that share any edge (segment between adjacent squares)
// on the same axis. Assigns each arrow a lane so that no two arrows
// sharing an edge occupy the same lane. Returns a Map: move -> { index, groupSize }.
function groupOverlappingArrows(arrows) {
  const result = new Map();

  function getEdges(ply) {
    const sqs = ply.squares || [];
    const edges = new Set();
    for (let i = 0; i < sqs.length - 1; i++) {
      const a = sqs[i], b = sqs[i + 1];
      edges.add(a < b ? a + "-" + b : b + "-" + a);
    }
    return edges;
  }

  const byAxis = {};
  arrows.forEach(({ move }) => {
    const dir = move.ply.direction || "";
    const axis = dir === ">" || dir === "<" ? "h" : "v";
    if (!byAxis[axis]) byAxis[axis] = [];
    byAxis[axis].push(move);
  });

  for (const axis in byAxis) {
    const axisArrows = byAxis[axis];
    const edgeSets = axisArrows.map((m) => getEdges(m.ply));

    // Build edge -> list of arrow indices
    const edgeToArrows = {};
    axisArrows.forEach((_, i) => {
      for (const e of edgeSets[i]) {
        if (!edgeToArrows[e]) edgeToArrows[e] = [];
        edgeToArrows[e].push(i);
      }
    });

    // Greedy lane assignment: assign each arrow the lowest lane not
    // already taken by a neighbor on any shared edge.
    const lane = new Array(axisArrows.length).fill(-1);
    for (let i = 0; i < axisArrows.length; i++) {
      const usedLanes = new Set();
      for (const e of edgeSets[i]) {
        for (const j of edgeToArrows[e]) {
          if (j !== i && lane[j] >= 0) usedLanes.add(lane[j]);
        }
      }
      let l = 0;
      while (usedLanes.has(l)) l++;
      lane[i] = l;
    }

    // For each arrow, groupSize = max arrows on any of its edges
    for (let i = 0; i < axisArrows.length; i++) {
      let maxOnEdge = 1;
      for (const e of edgeSets[i]) {
        maxOnEdge = Math.max(maxOnEdge, edgeToArrows[e].length);
      }
      result.set(axisArrows[i], {
        index: lane[i],
        groupSize: maxOnEdge,
      });
    }
  }

  return result;
}

function getGroupOffsets(count, squareSize) {
  if (count === 1) return [{ dx: 0, dy: 0 }];

  const perRow = 2;
  const spacing = squareSize * 0.34;
  const offsets = [];
  const rows = Math.ceil(count / perRow);
  const totalHeight = (rows - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const itemsInRow = Math.min(perRow, count - row * perRow);
    const col = i % perRow;
    const rowWidth = (itemsInRow - 1) * spacing;
    const dx = -rowWidth / 2 + col * spacing;
    const dy = -totalHeight / 2 + row * spacing;
    offsets.push({ dx, dy });
  }
  return offsets;
}

function roundRect(ctx, x, y, width, height, radius) {
  const radii = {
    tl: 0,
    tr: 0,
    bl: 0,
    br: 0,
  };
  if (typeof radius === "object") {
    for (const side in radius) {
      radii[side] = radius[side];
    }
  } else {
    for (const side in radii) {
      radii[side] = radius;
    }
  }

  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + width - radii.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radii.tr);
  ctx.lineTo(x + width, y + height - radii.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radii.br, y + height);
  ctx.lineTo(x + radii.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.quadraticCurveTo(x, y, x + radii.tl, y);
  ctx.closePath();
}
