const { transformBoardXY } = require("./boardTransform");

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

function coordToCanvas(coord, { size, transform, squareSize, padding, axisSize, headerHeight }) {
  const bx = "abcdefgh".indexOf(coord[0]);
  const by = parseInt(coord.slice(1), 10) - 1;
  const { x: col, y: row } = transformBoardXY(bx, by, size, transform || [0, 0]);

  return {
    x: padding + axisSize + col * squareSize + squareSize / 2,
    y: padding + headerHeight + (size - 1 - row) * squareSize + squareSize / 2,
  };
}

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

exports.pieceSizes = pieceSizes;
exports.textSizes = textSizes;
exports.coordToCanvas = coordToCanvas;
exports.withAlpha = withAlpha;
exports.limitText = limitText;
exports.roundRect = roundRect;
