const fs = require("fs");
const { Board } = require("./Board");
const { Ply } = require("./Ply");
const { isArray, isString, last } = require("lodash");
const { pieceSizes, textSizes } = require("./drawUtils");
const { sanitizeOptions } = require("./options");
const { parseTheme } = require("./parseTheme");
const { SvgBuilder } = require("./SvgBuilder");
const { drawHeaderSvg } = require("./drawHeaderSvg");
const { drawAxisLabelsSvg, drawBoardSvg, drawUnplayedPiecesSvg } = require("./drawBoardSvg");

function TPStoSVG(args, streamTo) {
  let options;
  if (isArray(args)) {
    options = { tps: args[0] || "" };
    args.slice(1).forEach(function (arg) {
      const parts = arg.split("=");
      options[parts[0]] = parts[1];
    });
  } else {
    options = args;
  }
  sanitizeOptions(options);

  const svgString = TPStoSVGString(options);

  if (streamTo) {
    streamTo.end(svgString);
  } else if (isString(args) || isArray(args)) {
    let name = options.name || "takboard.svg";
    if (!name.endsWith(".svg")) {
      name += ".svg";
    }
    fs.writeFileSync("./" + name, svgString);
  }

  return svgString;
}

function TPStoSVGString(options) {
  options = options || {};
  sanitizeOptions(options);
  const theme = parseTheme(options.theme);

  const board = new Board(options);
  if (!board || (board.errors && board.errors.length)) {
    throw new Error(board.errors[0]);
  }

  let hlSquares = [];
  let evalText = "";
  if (options.plies && options.plies.length) {
    const plies = options.plies.map(function (ply) { return board.doPly(ply); });
    var ply = last(plies);
    hlSquares = ply.squares;
    evalText = ply.evalText || "";
    options.plyIsDone = true;
  } else if (options.ply) {
    var ply = board.doPly(options.ply);
    hlSquares = ply.squares;
    evalText = ply.evalText || "";
    options.plyIsDone = true;
  } else if (options.hl) {
    var ply = new Ply(options.hl);
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
    squareSize: squareSize,
    pieceSize: pieceSize,
    pieceRadius: pieceRadius,
    pieceSpacing: pieceSpacing,
    immovableSize: immovableSize,
    wallSize: wallSize,
    roadSize: roadSize,
    sideCoords: sideCoords,
    strokeWidth: strokeWidth,
    shadowOffset: shadowOffset,
    shadowBlur: shadowBlur,
    fontSize: fontSize,
    stackCountFontSize: stackCountFontSize,
    padding: padding,
    flatCounterHeight: flatCounterHeight,
    turnIndicatorHeight: turnIndicatorHeight,
    headerHeight: headerHeight,
    axisSize: axisSize,
    counterRadius: counterRadius,
    boardRadius: boardRadius,
    boardSize: boardSize,
    unplayedWidth: unplayedWidth,
    squareRadius: 0,
    squareMargin: 0,
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

  // Build SVG
  const svg = new SvgBuilder(canvasWidth, canvasHeight);
  svg.setFont(fontSize + "px " + options.font);

  // Background
  if (options.bgAlpha > 0) {
    svg.rect(0, 0, canvasWidth, canvasHeight, {
      fill: theme.colors.secondary,
      opacity: options.bgAlpha,
    });
  }

  // Header
  if (options.turnIndicator) {
    options._evalText = evalText;
    drawHeaderSvg(svg, options, board, theme, dims);
  }

  // Axis Labels
  let xAxis = [], yAxis = [];
  if (options.axisLabels) {
    var result = drawAxisLabelsSvg(svg, options, board, theme, dims);
    xAxis = result.xAxis;
    yAxis = result.yAxis;
  }

  // Board Squares & Pieces
  drawBoardSvg(svg, options, board, theme, hlSquares, xAxis, yAxis, dims);

  // Unplayed Pieces
  if (options.unplayedPieces) {
    drawUnplayedPiecesSvg(svg, options, board, theme, dims);
  }

  return svg.toString();
}

exports.TPStoSVG = TPStoSVG;
exports.TPStoSVGString = TPStoSVGString;
