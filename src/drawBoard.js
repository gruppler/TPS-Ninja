import { roundRect, withAlpha } from "./drawUtils.js";
import { isDark } from "./colors.js";
import { drawEvaluationBarCanvas } from "./drawEvaluationBar.js";

export function drawAxisLabels(
  ctx,
  options,
  board,
  theme,
  { fontSize, squareSize, padding, axisSize, headerHeight, boardSize }
) {
  let cols = "abcdefgh".substring(0, board.size).split("");
  let rows = "12345678".substring(0, board.size).split("");
  const yAxis = options.transform[0] % 2 ? cols : rows;
  if (options.transform[0] === 1 || options.transform[0] === 2) {
    yAxis.reverse();
  }
  const xAxis = options.transform[0] % 2 ? rows : cols;
  if (
    options.transform[1]
      ? options.transform[0] === 0 || options.transform[0] === 1
      : options.transform[0] === 2 || options.transform[0] === 3
  ) {
    xAxis.reverse();
  }

  // Draw large axis labels
  if (!options.axisLabelsSmall) {
    ctx.save();
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
    for (let i = 0; i < board.size; i++) {
      const coord = [xAxis[i], yAxis[i]];
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

  return { xAxis, yAxis };
}

export function createSquareDrawer(
  ctx,
  options,
  board,
  theme,
  hlSquares,
  xAxis,
  yAxis,
  {
    squareSize,
    pieceSize,
    pieceRadius,
    pieceSpacing,
    immovableSize,
    wallSize,
    roadSize,
    sideCoords,
    strokeWidth,
    shadowOffset,
    shadowBlur,
    stackCountFontSize,
    axisLabelFontSize,
    squareRadius,
    squareMargin,
    padding,
    axisSize,
    headerHeight,
    fontSize,
  }
) {
  const isAxisLabelTextLight = (square) => {
    const isDiamonds3 = theme.boardStyle === "diamonds3";

    if (
      !isDiamonds3 &&
      options.highlighter &&
      square.coord in options.highlighter
    ) {
      return isDark(options.highlighter[square.coord]);
    }

    let isTextLight;
    if (theme.boardChecker) {
      if (isDiamonds3) {
        isTextLight = square.isLight ? theme.board2Dark : theme.board1Dark;
      } else {
        isTextLight = square.isLight ? theme.board1Dark : theme.board2Dark;
      }
    } else {
      isTextLight = isDiamonds3 ? theme.board2Dark : theme.board1Dark;
    }

    if (
      !isDiamonds3 &&
      options.hlSquares &&
      hlSquares.includes(square.coord)
    ) {
      isTextLight = theme.primaryDark;
    }

    return Boolean(isTextLight);
  };

  const axisLabelInsetEm = () => {
    if (theme.boardStyle === "diamonds2" || theme.boardStyle === "grid3") {
      return 0.5;
    }
    if (theme.boardStyle === "grid2") {
      return 0.25;
    }
    return 0;
  };

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

  const drawSquareNumber = (square, text, corner = "br") => {
    ctx.save();
    ctx.font = `${axisLabelFontSize}px ${options.font}`;

    const isTextLight = isAxisLabelTextLight(square);
    const insetPx = axisLabelFontSize * axisLabelInsetEm();

    ctx.fillStyle = isTextLight
      ? theme.colors.textLight
      : theme.colors.textDark;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const cornerAnchor = axisLabelFontSize * 0.65;

    const x =
      (corner[1] === "r" ? squareSize - cornerAnchor : cornerAnchor) +
      (corner[1] === "r" ? -insetPx : insetPx);
    const y =
      (corner[0] === "b" ? squareSize - cornerAnchor : cornerAnchor) +
      (corner[0] === "b" ? -insetPx : insetPx);

    ctx.fillText(
      text,
      x,
      y
    );
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
      const overflow = Math.max(0, pieces.length - 10 - board.size);
      if (isImmovable) {
        if (z < overflow) {
          ctx.restore();
          return;
        }
        y += pieceSpacing * overflow;
      }
    } else {
      // Unplayed
      const stackColor =
        options.opening === "swap" && piece.index === 0 && !piece.isCapstone
          ? piece.color === 1
            ? 2
            : 1
          : piece.color;
      const caps = board.pieceCounts[stackColor].cap;
      const total = board.pieceCounts[stackColor].total;
      y = board.size - 1;
      if (piece.isCapstone) {
        y *= total - piece.index - 1;
      } else {
        y *= total - piece.index - caps - 1;
      }
      y *= -squareSize / (total - 1);
    }

    y = Math.round(y);

    if (piece.isCapstone) {
      ctx.fillStyle = theme.colors[`player${piece.color}special`];
      ctx.beginPath();
      ctx.arc(0, y, pieceSize / 2, 0, 2 * Math.PI);
    } else if (piece.isStanding) {
      ctx.fillStyle = theme.colors[`player${piece.color}special`];
      ctx.save();
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
      ctx.restore();
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

    // Fill
    ctx.save();
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffset;
    ctx.shadowColor = theme.colors.umbra;
    ctx.fill();
    ctx.restore();

    // Stroke
    if (theme.vars["piece-border-width"] > 0) {
      ctx.strokeStyle = theme.colors[`player${piece.color}border`];
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    // For walls, re-draw the shape for stroke since we restored context
    if (piece.isStanding && theme.vars["piece-border-width"] > 0) {
      ctx.save();
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
      ctx.strokeStyle = theme.colors[`player${piece.color}border`];
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
      ctx.restore();
    }

    // Stack Count (only on top piece)
    const isTopPiece = pieces && z === pieces.length - 1;
    if (options.stackCounts && isTopPiece && pieces.length > 1) {
      ctx.save();
      ctx.font = `${stackCountFontSize}px ${options.font}`;
      const darknessKey = piece.isCapstone || piece.isStanding
        ? `player${piece.color}SpecialDark`
        : `player${piece.color}FlatDark`;
      ctx.fillStyle = theme[darknessKey]
        ? theme.colors.textLight
        : theme.colors.textDark;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(String(pieces.length), 0, y);
      ctx.restore();
    }

    ctx.restore();
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

    if (theme.rings) {
      let ring = square.ring;
      if (theme.fromCenter) {
        ring = Math.round(board.size / 2) - ring + 1;
      }
      if (ring <= theme.rings) {
        ctx.fillStyle = theme.colors["ring" + ring];
        ctx.globalAlpha = theme.vars["rings-opacity"];
        drawSquareHighlight();
        ctx.globalAlpha = 1;
      }
    }

    if (options.highlighter && square.coord in options.highlighter) {
      ctx.fillStyle = withAlpha(options.highlighter[square.coord], 0.75);
      drawSquareHighlight();
    } else if (options.hlSquares && hlSquares.includes(square.coord)) {
      const alphas = [0.4, 0.75];
      if (!options.plyIsDone) {
        alphas.reverse();
      }
      ctx.fillStyle = withAlpha(
        theme.colors.primary,
        hlSquares.length > 1 && square.coord === hlSquares[0]
          ? alphas[0]
          : alphas[1]
      );
      drawSquareHighlight();
    }

    if (options.showRoads && square.connected.length && !board.isGameEndFlats) {
      square.connected.forEach((side) => {
        const coords = sideCoords[side];
        ctx.fillStyle = withAlpha(
          theme.colors[`player${square.color}road`],
          square.roads[side] ? 0.8 : 0.2
        );
        ctx.fillRect(coords[0], coords[1], roadSize, roadSize);
      });
      ctx.fillStyle = withAlpha(
        theme.colors[`player${square.color}road`],
        square.roads.length ? 0.8 : 0.2
      );
      ctx.fillRect(
        (squareSize - roadSize) / 2,
        (squareSize - roadSize) / 2,
        roadSize,
        roadSize
      );
    } else if (square.roads.length) {
      square.roads.forEach((side) => {
        const coords = sideCoords[side];
        ctx.fillStyle = withAlpha(theme.colors[`player${square.color}road`], 0.8);
        ctx.fillRect(coords[0], coords[1], roadSize, roadSize);
      });
      ctx.fillStyle = withAlpha(theme.colors[`player${square.color}road`], 0.8);
      ctx.fillRect(
        (squareSize - roadSize) / 2,
        (squareSize - roadSize) / 2,
        roadSize,
        roadSize
      );
    }

    // Small Axis Labels
    if (options.axisLabels && options.axisLabelsSmall) {
      let col = xAxis[square.x];
      let row = yAxis[square.y];
      if (options.transform[0] % 2) {
        [col, row] = [row, col];
      }
      if (square.edges.W) {
        drawSquareNumber(square, row, "tl");
      }
      if (square.edges.S) {
        drawSquareNumber(square, col, "br");
      }
    }

    if (square.piece) {
      if (board.isGameEndFlats && !square.piece.typeCode()) {
        ctx.fillStyle = withAlpha(
          theme.colors[`player${square.color}road`],
          0.4
        );
        drawSquareHighlight();
      }

      square.pieces.forEach(drawPiece);
    }

    ctx.restore();
  };

  return { drawSquare, drawPiece };
}

export function drawUnplayedPieces(
  ctx,
  options,
  board,
  theme,
  drawPiece,
  { squareSize, padding, axisSize, headerHeight, boardSize, boardRadius, unplayedWidth }
) {
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

  drawEvaluationBarCanvas(ctx, options, theme, {
    padding,
    axisSize,
    boardSize,
    unplayedWidth,
    headerHeight,
    boardRadius,
  });

  [1, 2].forEach((color) => {
    ctx.save();
    ctx.translate(
      padding + axisSize + boardSize + (color === 2) * squareSize * 0.75,
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
          } else if (!played) {
            pieces.shift();
          }
        } else if (!board.pieces.played[1][type].length) {
          if (!board.pieces.played[2][type].length) {
            pieces[0] = board.pieces.all[1][type][0];
          } else {
            pieces.unshift(board.pieces.all[1][type][0]);
          }
        }
      }
      pieces.reverse().forEach(drawPiece);
    });
    ctx.restore();
  });
}
