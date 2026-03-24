const { createCanvas } = require("canvas");
const { Board } = require("./Board");
const { Ply } = require("./Ply");
const { last } = require("lodash");
const { pieceSizes, textSizes } = require("./drawUtils");
const { sanitizeOptions } = require("./options");
const { parseTheme } = require("./parseTheme");
const { drawHeader } = require("./drawHeader");
const { drawAxisLabels, createSquareDrawer, drawUnplayedPieces } = require("./drawBoard");

function TPStoCanvas(options = {}) {
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
  const axisLabelFontSize = squareSize * 0.15;
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
    stackCountFontSize, axisLabelFontSize, padding, flatCounterHeight, turnIndicatorHeight,
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
}

exports.TPStoCanvas = TPStoCanvas;
