import fs from "fs";
import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import { Board } from "./Board.js";
import { Ply } from "./Ply.js";
import themes from "./themes.js";
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
    return theme || themes[0];
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

  const axisSize = options.axisLabels ? Math.round(fontSize * 1.5) : 0;

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
  if (options.axisLabels) {
    const cols = "abcdefgh".substring(0, board.size).split("");
    const rows = "12345678".substring(0, board.size).split("");
    const yAxis = options.transform[0] % 2 ? cols.concat() : rows.concat();
    if (options.transform[0] === 1 || options.transform[0] === 2) {
      yAxis.reverse();
    }
    const xAxis = options.transform[0] % 2 ? rows.concat() : cols.concat();
    if (
      options.transform[1]
        ? options.transform[0] === 0 || options.transform[0] === 1
        : options.transform[0] === 2 || options.transform[0] === 3
    ) {
      xAxis.reverse();
    }

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

    if (options.showRoads && square.connected.length) {
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
        const radius = (stackCountFontSize * 1.5) / 2;
        ctx.beginPath();
        ctx.arc(
          squareSize - radius,
          squareSize - radius,
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
          square.pieces.length,
          squareSize - radius,
          squareSize - radius * 0.9
        );
        ctx.restore();
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
