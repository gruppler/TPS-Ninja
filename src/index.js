const { createCanvas } = require("canvas");
const { Board } = require("./Board");
const { Ply } = require("./Ply");
const { itoa } = require("./Square");
const { themes } = require("./themes");

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
  imageSize: "md",
  textSize: "md",
  axisLabels: true,
  turnIndicator: true,
  flatCounts: true,
  komi: 0,
  opening: "swap",
  pieceShadows: true,
  showRoads: true,
  unplayedPieces: true,
  padding: true,
};

exports.TPStoPNG = function (args) {
  const options = { tps: args[0] };
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

exports.TPStoCanvas = function (options = {}) {
  let theme;

  for (let key in defaults) {
    if (options.hasOwnProperty(key)) {
      if (typeof defaults[key] === "boolean") {
        options[key] = options[key] !== "false";
      } else if (typeof defaults[key] === "number") {
        options[key] = Number(options[key]);
      }
    } else {
      options[key] = defaults[key];
    }
  }
  if (options.tps.length === 1) {
    options.tps = Number(options.tps);
  }
  if (options.theme && typeof options.theme === "string") {
    if (options.theme[0] === "{") {
      theme = JSON.parse(options.theme);
    } else {
      theme = themes.find((theme) => theme.id === options.theme);
      if (!theme) {
        throw new Error("Invalid theme ID: " + options.theme);
      }
    }
  }
  if (!theme) {
    theme = themes[0];
  }

  const board = new Board(options);
  if (!board || board.errors.length) {
    throw new Error(board.errors[0]);
  }

  let hlSquares = [];
  if (options.ply) {
    if (board.isGameEnd) {
      throw new Error(`The game has ended (${board.result})`);
    }
    const ply = new Ply(options.ply);
    if (ply.pieceCount > board.size) {
      throw new Error("Ply violates carry limit");
    }
    if (board.linenum === 1 && (ply.specialPiece || ply.movement)) {
      throw new Error("Invalid first move");
    }
    hlSquares = ply.squares;
    board.doPly(ply);
  } else if (options.hl) {
    hlSquares = new Ply(options.hl).squares;
  }

  // Dimensions
  const pieceSize = Math.round(
    (pieceSizes[options.imageSize] * 5) / board.size
  );
  const squareSize = pieceSize * 2;
  const roadSize = Math.round(squareSize * 0.31);
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

  const shadowBlur = Math.round(squareSize * 0.03);
  const shadowOffset = Math.round(squareSize * 0.02);
  const strokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.02
  );

  const fontSize = (squareSize * textSizes[options.textSize] * board.size) / 5;
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

  // Start Drawing
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.font = fontSize + "px sans";
  ctx.fillStyle = theme.colors.secondary;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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
          flats[0] + komi + " +" + (-komi).toString().replace(".5", "½");
      } else if (komi > 0) {
        flats[1] = flats[1] - komi + " +" + komi.toString().replace(".5", "½");
      }
    } else {
      flats[0] = "";
      flats[1] = "";
      if (komi < 0) {
        flats[0] = "+" + (-komi).toString().replace(".5", "½");
      } else if (komi > 0) {
        flats[1] = "+" + komi.toString().replace(".5", "½");
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
      options.player1 = limitText(
        ctx,
        options.player1,
        flats1Width - flatCount1Width - fontSize * 1.2
      );
      ctx.textAlign = "start";
      ctx.fillText(
        options.player1,
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
        flats[0][1] = flats[0][1].substr(1) + "+";
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
      options.player2 = limitText(
        ctx,
        options.player2,
        flats2Width - flatCount2Width - fontSize * 1.2
      );
      ctx.textAlign = "end";
      ctx.fillText(
        options.player2,
        padding + axisSize + boardSize - fontSize / 2,
        padding + flatCounterHeight / 2
      );
    }
    // Player 2 Flat Count
    if (options.flatCounts) {
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
  }

  // Axis Labels
  if (options.axisLabels) {
    ctx.save();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = fontSize * 0.05;
    ctx.shadowBlur = fontSize * 0.1;
    ctx.shadowColor = theme.secondaryDark
      ? theme.colors.textDark
      : theme.colors.textLight;
    ctx.fillStyle = theme.secondaryDark
      ? theme.colors.textLight
      : theme.colors.textDark;
    for (let i = 0; i < board.size; i++) {
      const coord = itoa(i, i);
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

    if (hlSquares.includes(square.coord)) {
      ctx.fillStyle = withAlpha(
        theme.colors.primary,
        hlSquares.length > 1 && square.coord === hlSquares[0] ? 0.4 : 0.75
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
    } else if (square.roads.length) {
      ctx.fillStyle = withAlpha(
        theme.colors[`player${square.color}road`],
        0.35
      );
      drawSquareHighlight();
    }

    if (square.piece) {
      square.pieces.forEach(drawPiece);
      drawPiece(square.piece);
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
    } else {
      // Unplayed
      const caps = board.pieceCounts[piece.color].cap;
      const total = board.pieceCounts[piece.color].total;
      y = board.size - 1;
      if (piece.isCapstone) {
        y *= total - piece.index - 1;
      } else {
        y *= total - piece.index - caps - 1;
      }
      y *= -squareSize / (total - 1);
    }

    y = Math.round(y);

    if (options.pieceShadows) {
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = shadowOffset;
      ctx.shadowColor = theme.colors.umbra;
    }
    ctx.strokeStyle = theme.colors[`player${piece.color}border`];
    ctx.lineWidth = strokeWidth;

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
    ctx.stroke();
    ctx.fill();

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
        padding +
          axisSize +
          boardSize +
          (color === 2) * (pieceSize + (squareSize - pieceSize) / 2),
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
            } else {
              if (!played) {
                pieces.shift();
              }
            }
          } else if (!board.pieces.played[1][type].length) {
            pieces.unshift(board.pieces.all[1][type][0]);
          }
        }
        pieces.reverse().forEach(drawPiece);
      });
      ctx.restore();
    });
  }

  canvas.isGameEnd = board.isGameEnd;
  canvas.linenum = board.linenum;
  canvas.id = board.result || board.getTPS();
  return canvas;
};

function withAlpha(color, alpha) {
  return color.substr(0, 7) + Math.round(256 * alpha).toString(16);
}

function limitText(ctx, text, width) {
  const originalLength = text.length;
  const suffix = "…";
  if (width <= 0) {
    return "";
  }
  while (text.length && ctx.measureText(text + suffix).width >= width) {
    text = text.substring(0, text.length - 1);
  }
  return text + (text.length < originalLength ? suffix : "");
}

function roundRect(ctx, x, y, width, height, radius) {
  let radii = {
    tl: 0,
    tr: 0,
    bl: 0,
    br: 0,
  };
  if (typeof radius === "object") {
    for (let side in radius) {
      radii[side] = radius[side];
    }
  } else {
    for (let side in radii) {
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
