const { roundRect, limitText } = require("./drawUtils");

function drawHeader(
  ctx,
  options,
  board,
  theme,
  { fontSize, squareSize, padding, axisSize, boardSize, unplayedWidth, flatCounterHeight, turnIndicatorHeight, counterRadius }
) {
  const flats = board.flats.concat();
  const komi = options.komi;
  const headerHeight = turnIndicatorHeight + flatCounterHeight;

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

  let evalText = options._evalText || "";
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

exports.drawHeader = drawHeader;
