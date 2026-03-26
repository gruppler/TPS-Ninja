function getEvaluationFill(evaluation, theme) {
  return evaluation > 0 ? theme.colors.player1 : theme.colors.player2;
}

export function getEvaluationBarRect(options, dims) {
  if (!options.boardEvalBar || !options.unplayedPieces) {
    return null;
  }

  if (options.evaluation === null || options.evaluation === undefined) {
    return null;
  }

  const evaluation = Number(options.evaluation);
  if (isNaN(evaluation)) {
    return null;
  }

  const clamped = Math.max(-100, Math.min(100, evaluation));
  if (!clamped) {
    return null;
  }

  const { padding, axisSize, boardSize, unplayedWidth, headerHeight } = dims;
  const x = padding + axisSize + boardSize;
  const y = padding + headerHeight + axisSize;
  const width = unplayedWidth;
  const height = Math.round((boardSize * Math.abs(clamped)) / 100);

  return {
    evaluation: clamped,
    x,
    y: y + (boardSize - height),
    width,
    height,
  };
}

export function drawEvaluationBarCanvas(ctx, options, theme, dims) {
  const rect = getEvaluationBarRect(options, dims);
  if (!rect) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = getEvaluationFill(rect.evaluation, theme);
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

export function drawEvaluationBarSvg(svg, options, theme, dims) {
  const rect = getEvaluationBarRect(options, dims);
  if (!rect) {
    return;
  }

  svg.rect(rect.x, rect.y, rect.width, rect.height, {
    fill: getEvaluationFill(rect.evaluation, theme),
    opacity: 0.3,
  });
}
