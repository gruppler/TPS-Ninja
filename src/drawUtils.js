import { transformBoardXY } from "./boardTransform.js";

export const pieceSizes = {
  xs: 12,
  sm: 24,
  md: 48,
  lg: 96,
  xl: 192,
};

export const textSizes = {
  xs: 0.1875,
  sm: 0.21875,
  md: 0.25,
  lg: 0.3,
  xl: 0.4,
};

export function computeCanvasDimensions(pieceSize, board, options, theme) {
  const squareSize = pieceSize * 2;
  const roadSize = Math.round(squareSize * 0.3333);

  const strokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.013,
  );

  const fontSize = (squareSize * textSizes[options.textSize] * board.size) / 5;
  const padding = options.padding ? Math.round(fontSize * 0.5) : 0;

  const flatCounterHeight = options.turnIndicator
    ? Math.round(fontSize * 2)
    : 0;
  const turnIndicatorHeight =
    options.turnIndicator && !options.hideTurnIndicator
      ? Math.round(fontSize * 0.5)
      : 0;
  // In vertical layout the move number gets a row of its own above the
  // header, and the unplayed pieces sit below the board instead of beside it
  const moveNumberRowHeight =
    options.verticalLayout && options.moveNumber && options.unplayedPieces
      ? Math.round(fontSize * 1.5)
      : 0;
  const headerHeight =
    moveNumberRowHeight + flatCounterHeight + turnIndicatorHeight;

  const axisSize =
    options.axisLabels && !options.axisLabelsSmall
      ? Math.round(fontSize * 1.5)
      : 0;

  const boardSize = squareSize * board.size;
  const unplayedWidth =
    options.unplayedPieces && !options.verticalLayout
      ? Math.round(squareSize * 1.75)
      : 0;
  const unplayedHeight =
    options.unplayedPieces && options.verticalLayout ? squareSize : 0;

  const width = unplayedWidth + axisSize + boardSize + padding * 2;
  const height =
    headerHeight + axisSize + boardSize + unplayedHeight + padding * 2;

  return { width, height };
}

export function coordToCanvas(
  coord,
  { size, transform, squareSize, padding, axisSize, headerHeight },
) {
  const bx = "abcdefgh".indexOf(coord[0]);
  const by = parseInt(coord.slice(1), 10) - 1;
  const { x: col, y: row } = transformBoardXY(
    bx,
    by,
    size,
    transform || [0, 0],
  );

  return {
    x: padding + axisSize + col * squareSize + squareSize / 2,
    y: padding + headerHeight + (size - 1 - row) * squareSize + squareSize / 2,
  };
}

// Where a played piece sits in its stack: how far above the square's center
// it's drawn, and whether it's beyond the carry limit, where pieces are drawn
// as tabs beside the stack. Null for a piece buried too deep in a very tall
// stack to be drawn at all.
export function getStackOffset(piece, board, pieceSpacing) {
  const pieces = piece.square.pieces;
  const z = piece.z();
  const isOverLimit = pieces.length > board.size;
  const isImmovable = isOverLimit && z < pieces.length - board.size;

  let y = -pieceSpacing * z;
  if (isOverLimit && !isImmovable) {
    y += pieceSpacing * (pieces.length - board.size);
  }
  if (piece.isStanding && pieces.length > 1) {
    y += pieceSpacing;
  }
  if (isImmovable) {
    const overflow = Math.max(0, pieces.length - 10 - board.size);
    if (z < overflow) {
      return null;
    }
    y += pieceSpacing * overflow;
  }

  return { y: Math.round(y), isImmovable };
}

// How thick the ring on each of the last ply's pieces is, in every theme
export function getPieceOutlineWidth(squareSize) {
  return Math.max(2, Math.round(squareSize * 0.025));
}

// The ring on a piece of the last ply, drawn over the piece at its outer
// edge, as layers filled in the piece's shape, each inset from the shape's
// path (where its border is stroked) and with its own corner radius. Inside
// the ring, the border goes on to meet the fill: what's left of it, and at
// least one unit of it, the unit the theme's piece-border-width counts in.
// The fill is redrawn last with the corners an unringed piece has, and the
// layers outside it have corners concentric with it. A standing stone keeps
// a third of its width unringed.
export function getPieceRing(squareSize, strokeWidth, pieceRadius, wallSize) {
  const unit = Math.max(1, Math.round(squareSize * 0.013));
  const edge = strokeWidth / 2;
  const layers = (width) => {
    const border = strokeWidth
      ? Math.max(Math.min(unit, strokeWidth), strokeWidth - width)
      : 0;
    // Concentric corners, from the fill's, which an unringed piece has too
    const fillRadius = Math.max(0, pieceRadius - edge);
    const result = [
      {
        color: "primary",
        inset: -edge,
        radius: fillRadius + border + width,
      },
    ];
    if (border) {
      result.push({
        color: "border",
        inset: width - edge,
        radius: fillRadius + border,
      });
    }
    result.push({
      color: "fill",
      inset: width + border - edge,
      radius: fillRadius,
    });
    // The piece under the ring takes the ring's outer corners, so that none
    // of it shows past them: this is the corner of its path
    const pathRadius = Math.max(0, fillRadius + border + width - edge);
    return { width, border, pathRadius, layers: result };
  };
  const width = getPieceOutlineWidth(squareSize);
  return {
    piece: layers(width),
    wall: layers(Math.min(width, (wallSize + strokeWidth) / 3)),
  };
}

export function withAlpha(color, alpha) {
  return color.substring(0, 7) + Math.round(256 * alpha).toString(16);
}

export function limitText(ctx, text, width) {
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

export function roundRect(ctx, x, y, width, height, radius) {
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
