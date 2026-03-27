import { roundRect } from "./drawUtils.js";

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function pickDefined(...values) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined) {
      return values[i];
    }
  }
  return undefined;
}

function normalizeWDL(wdl = null, evaluation = null) {
  let player1 = null;
  let draw = null;
  let player2 = null;

  if (wdl && typeof wdl === "object") {
    if (Array.isArray(wdl)) {
      player1 = toFiniteNumber(wdl[0]);
      draw = toFiniteNumber(wdl[1]);
      player2 = toFiniteNumber(wdl[2]);
    } else {
      player1 = toFiniteNumber(
        pickDefined(wdl.player1, wdl.p1, wdl.win1, wdl.wins1, wdl.white, wdl.win)
      );
      draw = toFiniteNumber(pickDefined(wdl.draw, wdl.draws, wdl.d));
      player2 = toFiniteNumber(
        pickDefined(
          wdl.player2,
          wdl.p2,
          wdl.win2,
          wdl.wins2,
          wdl.black,
          wdl.loss !== undefined ? wdl.loss : wdl.win2
        )
      );
    }
  }

  if (player1 !== null || draw !== null || player2 !== null) {
    player1 = player1 || 0;
    draw = draw || 0;
    player2 = player2 || 0;
    const total = player1 + draw + player2;
    if (total > 0) {
      const player1Pct = clampPercent((100 * player1) / total);
      const drawPct = clampPercent((100 * draw) / total);
      const player2Pct = clampPercent(100 - player1Pct - drawPct);
      return {
        player1: player1Pct,
        draw: drawPct,
        player2: player2Pct,
      };
    }
  }

  const evalValue = toFiniteNumber(evaluation);
  if (evalValue === null) {
    return null;
  }

  const player1Pct = clampPercent((100 + evalValue) / 2);
  return {
    player1: player1Pct,
    draw: 0,
    player2: 100 - player1Pct,
  };
}

function resolveWDL(options) {
  if (options.wdl != null) {
    return options.wdl;
  }

  if (
    options.wins1 != null ||
    options.draws != null ||
    options.wins2 != null
  ) {
    return {
      player1: options.wins1,
      draw: options.draws,
      player2: options.wins2,
    };
  }

  return null;
}

function getSegmentHeights(totalHeight, wdl) {
  let player1 = Math.max(0, Math.round((totalHeight * wdl.player1) / 100));
  let draw = Math.max(0, Math.round((totalHeight * wdl.draw) / 100));
  let player2 = totalHeight - player1 - draw;

  if (player2 < 0) {
    const overflow = -player2;
    if (draw >= overflow) {
      draw -= overflow;
    } else {
      player1 = Math.max(0, player1 - (overflow - draw));
      draw = 0;
    }
    player2 = 0;
  }

  return { player1, draw, player2 };
}

function markerColor(theme) {
  return theme.secondaryDark ? theme.colors.textLight : theme.colors.textDark;
}

function drawFillSegmentsCanvas(ctx, bar, theme) {
  const heights = getSegmentHeights(bar.height, bar.wdl);
  const segments = [
    { height: heights.player1, fill: theme.colors.player1 },
    { height: heights.draw, fill: theme.colors.board3 },
    { height: heights.player2, fill: theme.colors.player2 },
  ];

  let currentBottom = bar.y + bar.height;
  segments.forEach(({ height, fill }) => {
    if (!height) return;
    const top = currentBottom - height;
    ctx.fillStyle = fill;
    ctx.fillRect(bar.x, top, bar.width, height);
    currentBottom = top;
  });
}

function drawFillSegmentsSvg(svg, bar, theme) {
  const heights = getSegmentHeights(bar.height, bar.wdl);
  const segments = [
    { height: heights.player1, fill: theme.colors.player1 },
    { height: heights.draw, fill: theme.colors.board3 },
    { height: heights.player2, fill: theme.colors.player2 },
  ];

  let currentBottom = bar.y + bar.height;
  segments.forEach(({ height, fill }) => {
    if (!height) return;
    const top = currentBottom - height;
    svg.rect(bar.x, top, bar.width, height, {
      fill,
      opacity: 0.3,
    });
    currentBottom = top;
  });
}

export function getEvaluationBarRect(options, dims) {
  if (!options.boardEvalBar || !options.unplayedPieces) {
    return null;
  }

  const wdl = normalizeWDL(resolveWDL(options), options.evaluation);
  if (!wdl) {
    return null;
  }

  const { padding, axisSize, boardSize, unplayedWidth, headerHeight } = dims;
  return {
    x: padding + axisSize + boardSize,
    y: padding + headerHeight,
    width: unplayedWidth,
    height: boardSize,
    wdl,
  };
}

export function drawEvaluationBarCanvas(ctx, options, theme, dims) {
  const bar = getEvaluationBarRect(options, dims);
  if (!bar) {
    return;
  }

  const radius = Math.min(dims.boardRadius || 0, bar.width, bar.height);

  ctx.save();
  roundRect(ctx, bar.x, bar.y, bar.width, bar.height, {
    tr: radius,
    br: radius,
  });
  ctx.clip();
  ctx.globalAlpha = 0.3;
  drawFillSegmentsCanvas(ctx, bar, theme);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = markerColor(theme);
  ctx.lineWidth = 1;
  const midY = bar.y + bar.height / 2;
  ctx.beginPath();
  ctx.moveTo(bar.x, midY);
  ctx.lineTo(bar.x + bar.width, midY);
  ctx.stroke();
  ctx.restore();
}

export function drawEvaluationBarSvg(svg, options, theme, dims) {
  const bar = getEvaluationBarRect(options, dims);
  if (!bar) {
    return;
  }

  const radius = Math.min(dims.boardRadius || 0, bar.width, bar.height);
  const clipId = "evalBarClip";
  svg.addDef(
    clipId,
    `<clipPath id="${clipId}"><path d="${svg.roundRectPath(
      bar.x,
      bar.y,
      bar.width,
      bar.height,
      { tr: radius, br: radius }
    )}"/></clipPath>`
  );

  svg.openGroup({ clipPath: clipId });
  drawFillSegmentsSvg(svg, bar, theme);
  svg.closeGroup();

  const midY = bar.y + bar.height / 2;
  svg.line(bar.x, midY, bar.x + bar.width, midY, {
    stroke: markerColor(theme),
    strokeWidth: 1,
    opacity: 0.2,
  });
}
