import { roundRect } from "./drawUtils.js";
import { isDark } from "./colors.js";

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
        pickDefined(
          wdl.player1,
          wdl.p1,
          wdl.win1,
          wdl.wins1,
          wdl.white,
          wdl.win,
        ),
      );
      draw = toFiniteNumber(pickDefined(wdl.draw, wdl.draws, wdl.d));
      player2 = toFiniteNumber(
        pickDefined(
          wdl.player2,
          wdl.p2,
          wdl.win2,
          wdl.wins2,
          wdl.black,
          wdl.loss !== undefined ? wdl.loss : wdl.win2,
        ),
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

  if (options.wins1 != null || options.draws != null || options.wins2 != null) {
    return {
      player1: options.wins1,
      draw: options.draws,
      player2: options.wins2,
    };
  }

  return null;
}

function shouldShowWdlSegments(options) {
  if (options.evalBarMode === "wdl" || options.showWdlBars === true) {
    return true;
  }
  if (options.evalBarMode === "single" || options.showWdlBars === false) {
    return false;
  }
  return (
    options.wins1 != null || options.draws != null || options.wins2 != null
  );
}

function resolvePlayer1Percent(bar) {
  if (bar.wdl) {
    return clampPercent(bar.wdl.player1 + bar.wdl.draw / 2);
  }
  const evalValue = toFiniteNumber(bar.evaluation);
  if (evalValue !== null) {
    return clampPercent((100 + evalValue) / 2);
  }
  return null;
}

function getSingleSegmentRect(bar) {
  const player1Percent = resolvePlayer1Percent(bar);
  if (player1Percent === null) {
    return null;
  }
  const magnitude = Math.max(0, Math.min(100, Math.abs(player1Percent - 50) * 2));
  if (magnitude <= 0) {
    return null;
  }
  const segmentHeight = Math.max(0, Math.round((bar.height * magnitude) / 100));
  if (!segmentHeight) {
    return null;
  }
  const winner = player1Percent > 50 ? "player1" : "player2";
  return {
    winner,
    x: bar.x,
    y: bar.y + bar.height - segmentHeight,
    width: bar.width,
    height: segmentHeight,
  };
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

function midpointSegment(bar) {
  if (!bar.showWdlSegments || !bar.wdl) {
    return "draw";
  }
  const heights = getSegmentHeights(bar.height, bar.wdl);
  const midpointOffset = bar.height / 2;
  if (midpointOffset < heights.player2) {
    return "player2";
  }
  if (midpointOffset < heights.player2 + heights.draw) {
    return "draw";
  }
  return "player1";
}

function markerColor(theme, bar) {
  const currentTheme = theme || {};
  const colors = currentTheme.colors || {};
  const resolveDark = (flag, color) => {
    if (flag === true || flag === false) {
      return flag;
    }
    if (color) {
      return isDark(color);
    }
    return false;
  };

  const segment = midpointSegment(bar);
  const isDarkBySegment = {
    player1: resolveDark(currentTheme.player1Dark, colors.player1),
    player2: resolveDark(currentTheme.player2Dark, colors.player2),
    draw: resolveDark(
      currentTheme.board3Dark !== undefined
        ? currentTheme.board3Dark
        : currentTheme.secondaryDark,
      colors.board3,
    ),
  };
  const segmentIsDark = isDarkBySegment[segment];

  return segmentIsDark ? "#ffffff" : "#000000";
}

function drawFillSegmentsCanvas(ctx, bar, theme) {
  if (!bar.wdl) {
    return;
  }
  if (bar.horizontal) {
    // Horizontal bar: player1 on left, draw in middle, player2 on right
    const widths = getSegmentHeights(bar.width, bar.wdl);
    let currentLeft = bar.x;
    [
      { size: widths.player1, fill: theme.colors.player1 },
      { size: widths.draw, fill: theme.colors.board3 },
      { size: widths.player2, fill: theme.colors.player2 },
    ].forEach(({ size, fill }) => {
      if (!size) return;
      ctx.fillStyle = fill;
      ctx.fillRect(currentLeft, bar.y, size, bar.height);
      currentLeft += size;
    });
    return;
  }
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

function drawSingleSegmentCanvas(ctx, bar, theme) {
  if (bar.horizontal) {
    const player1Percent = resolvePlayer1Percent(bar);
    if (player1Percent === null) return;
    const magnitude = Math.max(0, Math.min(100, Math.abs(player1Percent - 50) * 2));
    if (magnitude <= 0) return;
    const segmentWidth = Math.max(0, Math.round((bar.width * magnitude) / 100));
    if (!segmentWidth) return;
    const winner = player1Percent > 50 ? "player1" : "player2";
    ctx.fillStyle =
      winner === "player1" ? theme.colors.player1 : theme.colors.player2;
    const x = winner === "player1" ? bar.x : bar.x + bar.width - segmentWidth;
    ctx.fillRect(x, bar.y, segmentWidth, bar.height);
    return;
  }
  const segment = getSingleSegmentRect(bar);
  if (!segment) {
    return;
  }
  ctx.fillStyle =
    segment.winner === "player1" ? theme.colors.player1 : theme.colors.player2;
  ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
}

function drawFillSegmentsSvg(svg, bar, theme) {
  if (!bar.wdl) {
    return;
  }
  if (bar.horizontal) {
    const widths = getSegmentHeights(bar.width, bar.wdl);
    let currentLeft = bar.x;
    [
      { size: widths.player1, fill: theme.colors.player1 },
      { size: widths.draw, fill: theme.colors.board3 },
      { size: widths.player2, fill: theme.colors.player2 },
    ].forEach(({ size, fill }) => {
      if (!size) return;
      svg.rect(currentLeft, bar.y, size, bar.height, { fill, opacity: 0.3 });
      currentLeft += size;
    });
    return;
  }
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

function drawSingleSegmentSvg(svg, bar, theme) {
  if (bar.horizontal) {
    const player1Percent = resolvePlayer1Percent(bar);
    if (player1Percent === null) return;
    const magnitude = Math.max(0, Math.min(100, Math.abs(player1Percent - 50) * 2));
    if (magnitude <= 0) return;
    const segmentWidth = Math.max(0, Math.round((bar.width * magnitude) / 100));
    if (!segmentWidth) return;
    const winner = player1Percent > 50 ? "player1" : "player2";
    const fill =
      winner === "player1" ? theme.colors.player1 : theme.colors.player2;
    const x = winner === "player1" ? bar.x : bar.x + bar.width - segmentWidth;
    svg.rect(x, bar.y, segmentWidth, bar.height, { fill, opacity: 0.3 });
    return;
  }
  const segment = getSingleSegmentRect(bar);
  if (!segment) {
    return;
  }
  const fill =
    segment.winner === "player1" ? theme.colors.player1 : theme.colors.player2;
  svg.rect(segment.x, segment.y, segment.width, segment.height, {
    fill,
    opacity: 0.3,
  });
}

export function getEvaluationBarRect(options, dims) {
  if (!options.boardEvalBar || !options.unplayedPieces) {
    return null;
  }

  const showWdlSegments = shouldShowWdlSegments(options);
  const evaluation = toFiniteNumber(options.evaluation);
  const wdl = normalizeWDL(resolveWDL(options), evaluation);
  const hasSingleData = evaluation !== null || wdl !== null;
  if (!hasSingleData || (showWdlSegments && !wdl)) {
    return null;
  }

  const { padding, axisSize, boardSize, unplayedWidth, unplayedHeight, headerHeight } = dims;

  if (options.verticalLayout) {
    return {
      x: padding + axisSize,
      y: padding + headerHeight + boardSize,
      width: boardSize,
      height: unplayedHeight,
      wdl,
      evaluation,
      showWdlSegments,
      horizontal: true,
    };
  }

  return {
    x: padding + axisSize + boardSize,
    y: padding + headerHeight,
    width: unplayedWidth,
    height: boardSize,
    wdl,
    evaluation,
    showWdlSegments,
    horizontal: false,
  };
}

export function drawEvaluationBarCanvas(ctx, options, theme, dims) {
  const bar = getEvaluationBarRect(options, dims);
  if (!bar) {
    return;
  }

  const radius = Math.min(dims.boardRadius || 0, bar.width, bar.height);
  const corners = bar.horizontal
    ? { bl: radius, br: radius }
    : { tr: radius, br: radius };

  ctx.save();
  roundRect(ctx, bar.x, bar.y, bar.width, bar.height, corners);
  ctx.clip();
  ctx.globalAlpha = 0.3;
  if (bar.showWdlSegments) {
    drawFillSegmentsCanvas(ctx, bar, theme);
  } else {
    drawSingleSegmentCanvas(ctx, bar, theme);
  }
  ctx.restore();

  if (bar.showWdlSegments) {
    ctx.save();
    ctx.strokeStyle = markerColor(theme, bar);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (bar.horizontal) {
      const midX = bar.x + bar.width / 2;
      ctx.moveTo(midX, bar.y);
      ctx.lineTo(midX, bar.y + bar.height);
    } else {
      const midY = bar.y + bar.height / 2;
      ctx.moveTo(bar.x, midY);
      ctx.lineTo(bar.x + bar.width, midY);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function drawEvaluationBarSvg(svg, options, theme, dims) {
  const bar = getEvaluationBarRect(options, dims);
  if (!bar) {
    return;
  }

  const radius = Math.min(dims.boardRadius || 0, bar.width, bar.height);
  const corners = bar.horizontal
    ? { bl: radius, br: radius }
    : { tr: radius, br: radius };
  const clipId = "evalBarClip";
  svg.addDef(
    clipId,
    `<clipPath id="${clipId}"><path d="${svg.roundRectPath(
      bar.x,
      bar.y,
      bar.width,
      bar.height,
      corners,
    )}"/></clipPath>`,
  );

  svg.openGroup({ clipPath: clipId });
  if (bar.showWdlSegments) {
    drawFillSegmentsSvg(svg, bar, theme);
  } else {
    drawSingleSegmentSvg(svg, bar, theme);
  }
  svg.closeGroup();

  if (bar.showWdlSegments) {
    if (bar.horizontal) {
      const midX = bar.x + bar.width / 2;
      svg.line(midX, bar.y, midX, bar.y + bar.height, {
        stroke: markerColor(theme, bar),
        strokeWidth: 1,
        opacity: 0.35,
      });
    } else {
      const midY = bar.y + bar.height / 2;
      svg.line(bar.x, midY, bar.x + bar.width, midY, {
        stroke: markerColor(theme, bar),
        strokeWidth: 1,
        opacity: 0.35,
      });
    }
  }
}
