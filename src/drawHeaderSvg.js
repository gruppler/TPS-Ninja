import { withAlpha } from "./drawUtils.js";

function limitTextSvg(svg, text, width) {
  const suffix = "…";
  if (width <= 0) return "";
  if (width >= svg.measureText(text).width) return text;
  do {
    text = text.substring(0, text.length - 1);
  } while (text.length && svg.measureText(text + suffix).width >= width);
  return text + suffix;
}

export function drawHeaderSvg(
  svg,
  options,
  board,
  theme,
  { fontSize, squareSize, padding, axisSize, boardSize, unplayedWidth, flatCounterHeight, turnIndicatorHeight, counterRadius }
) {
  const flats = board.flats.concat();
  const komi = options.komi;
  const headerHeight = turnIndicatorHeight + flatCounterHeight;
  const font = options.font;

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
  svg.path(
    svg.roundRectPath(
      padding + axisSize,
      padding,
      flats1Width,
      flatCounterHeight,
      { tl: counterRadius }
    ),
    { fill: theme.colors.player1 }
  );

  svg.path(
    svg.roundRectPath(
      padding + axisSize + flats1Width,
      padding,
      flats2Width,
      flatCounterHeight,
      { tr: counterRadius }
    ),
    { fill: theme.colors.player2 }
  );

  if (komiWidth) {
    const flatWidth = komi < 0 ? flats1Width : flats2Width;
    const dark = komi < 0 ? theme.player1Dark : theme.player2Dark;
    const komiColor = dark ? "#fff" : "#000";
    if (komiWidth >= flatWidth) {
      svg.path(
        svg.roundRectPath(
          padding + axisSize + (komi > 0) * flats1Width,
          padding,
          flatWidth,
          flatCounterHeight,
          { [komi < 0 ? "tl" : "tr"]: counterRadius }
        ),
        { fill: komiColor, opacity: 0.13 }
      );
    } else {
      svg.rect(
        padding + axisSize + flats1Width - (komi < 0) * komiWidth,
        padding,
        komiWidth,
        flatCounterHeight,
        { fill: komiColor, opacity: 0.13 }
      );
    }
  }

  // Flat Counts
  svg.setFont(`${fontSize}px ${font}`);
  const textY = padding + flatCounterHeight / 2;

  const fill1 = theme.player1Dark
    ? theme.colors.textLight
    : theme.colors.textDark;

  // Player 1 Name
  if (options.player1) {
    const flatCount1Width = svg.measureText(flats[0]).width;
    const player1 = limitTextSvg(
      svg,
      options.player1,
      flats1Width - flatCount1Width - fontSize * 1.2
    );
    svg.text(
      padding + axisSize + fontSize / 2,
      textY,
      player1,
      { fill: fill1, fontSize, fontFamily: font, textAnchor: "start", dy: "0.35em" }
    );
  }
  // Player 1 Flat Count
  if (flats[0] !== "") {
    const parts = String(flats[0]).split(" ");
    svg.text(
      padding + axisSize + flats1Width - fontSize / 2,
      textY,
      parts[0],
      { fill: fill1, fontSize, fontFamily: font, textAnchor: "end", dy: "0.35em" }
    );
    if (parts[1]) {
      const mainWidth = svg.measureText(parts[0] + " ").width;
      const komiText = parts[1].substring(1) + "+";
      svg.text(
        padding + axisSize + flats1Width - fontSize / 2 - mainWidth,
        textY,
        komiText,
        { fill: fill1, fontSize, fontFamily: font, textAnchor: "end", dy: "0.35em", opacity: 0.5 }
      );
    }
  }

  const fill2 = theme.player2Dark
    ? theme.colors.textLight
    : theme.colors.textDark;

  // Player 2 Name
  if (options.player2) {
    const flatCount2Width = svg.measureText(flats[1]).width;
    const player2 = limitTextSvg(
      svg,
      options.player2,
      flats2Width - flatCount2Width - fontSize * 1.2
    );
    svg.text(
      padding + axisSize + boardSize - fontSize / 2,
      textY,
      player2,
      { fill: fill2, fontSize, fontFamily: font, textAnchor: "end", dy: "0.35em" }
    );
  }
  // Player 2 Flat Count
  if (flats[1] !== "") {
    const parts = String(flats[1]).split(" ");
    svg.text(
      padding + axisSize + flats1Width + fontSize / 2,
      textY,
      parts[0],
      { fill: fill2, fontSize, fontFamily: font, textAnchor: "start", dy: "0.35em" }
    );
    if (parts[1]) {
      const mainWidth = svg.measureText(parts[0] + " ").width;
      svg.text(
        padding + axisSize + flats1Width + fontSize / 2 + mainWidth,
        textY,
        parts[1],
        { fill: fill2, fontSize, fontFamily: font, textAnchor: "start", dy: "0.35em", opacity: 0.5 }
      );
    }
  }

  // Turn Indicator
  if (!board.isGameEnd) {
    svg.rect(
      padding + axisSize + (board.player === 1 ? 0 : boardSize / 2),
      padding + flatCounterHeight,
      boardSize / 2,
      turnIndicatorHeight,
      { fill: theme.colors.primary }
    );
  }

  // Move number
  const textShadowFiltId = "textShadow";
  const shadowColor =
    theme.secondaryDark || options.bgAlpha < 0.5
      ? theme.colors.textDark
      : theme.colors.textLight;
  svg.shadowFilter(textShadowFiltId, 0, fontSize * 0.05, fontSize * 0.1, shadowColor);

  const textFill =
    theme.secondaryDark || options.bgAlpha < 0.5
      ? theme.colors.textLight
      : theme.colors.textDark;

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
    svg.setFont(`${fontSize}px ${font}`);
    moveNumberWidth = svg.measureText(moveNumber).width;
    svg.text(
      padding + axisSize + boardSize + unplayedWidth / 2,
      padding + flatCounterHeight / 2,
      moveNumber,
      {
        fill: textFill,
        fontSize,
        fontFamily: font,
        textAnchor: "middle",
        dy: "0.35em",
        filter: textShadowFiltId,
      }
    );
  }

  // Eval text
  let evalText = options._evalText || "";
  if (options.evalText && options.unplayedPieces && evalText) {
    if (moveNumberWidth) {
      evalText = " " + evalText;
    }
    svg.text(
      padding + axisSize + boardSize + unplayedWidth / 2 + moveNumberWidth / 2,
      padding + flatCounterHeight / 2,
      evalText,
      {
        fill: theme.colors.primary,
        fontSize,
        fontWeight: "bold",
        fontFamily: font,
        textAnchor: options.moveNumber ? "start" : "middle",
        dy: "0.35em",
        filter: textShadowFiltId,
      }
    );
  }
}
