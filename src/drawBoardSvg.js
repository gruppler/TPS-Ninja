import { withAlpha } from "./drawUtils.js";

export function drawAxisLabelsSvg(
  svg,
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
    const shadowColor =
      theme.secondaryDark || options.bgAlpha < 0.5
        ? theme.colors.textDark
        : theme.colors.textLight;
    const fillColor =
      theme.secondaryDark || options.bgAlpha < 0.5
        ? theme.colors.textLight
        : theme.colors.textDark;

    const filterId = "axisLabelShadow";
    svg.shadowFilter(filterId, 0, fontSize * 0.05, fontSize * 0.1, shadowColor);

    for (let i = 0; i < board.size; i++) {
      const coord = [xAxis[i], yAxis[i]];
      // X axis (bottom)
      svg.text(
        padding + axisSize + squareSize * i + squareSize / 2,
        padding +
          headerHeight +
          boardSize +
          (padding ? (axisSize + padding) / 2 : axisSize),
        coord[0],
        {
          fill: fillColor,
          fontSize,
          fontFamily: options.font,
          textAnchor: "middle",
          dy: padding ? "0.35em" : "0",
          filter: filterId,
        }
      );
      // Y axis (left)
      svg.text(
        padding ? (axisSize + padding) / 2 : 0,
        padding +
          headerHeight +
          squareSize * (board.size - i - 1) +
          squareSize / 2,
        coord[1],
        {
          fill: fillColor,
          fontSize,
          fontFamily: options.font,
          textAnchor: padding ? "middle" : "start",
          dy: "0.35em",
          filter: filterId,
        }
      );
    }
  }

  return { xAxis, yAxis };
}

export function drawBoardSvg(
  svg,
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
    squareRadius,
    squareMargin,
    padding,
    axisSize,
    headerHeight,
    fontSize,
  }
) {
  // Shadow filter for pieces
  const pieceShadowId = "pieceShadow";
  svg.shadowFilter(pieceShadowId, 0, shadowOffset, shadowBlur, theme.colors.umbra);

  function squareOriginX(square) {
    return padding + axisSize + square.x * squareSize;
  }
  function squareOriginY(square) {
    return padding + headerHeight + (board.size - square.y - 1) * squareSize;
  }

  function drawSquareHighlightEl(sx, sy, fill, opacity) {
    const half = squareSize / 2;
    if (squareRadius >= half) {
      svg.circle(sx + half, sy + half, half, { fill, opacity });
    } else {
      svg.path(
        svg.roundRectPath(
          sx + squareMargin,
          sy + squareMargin,
          squareSize - squareMargin * 2,
          squareSize - squareMargin * 2,
          squareRadius
        ),
        { fill, opacity }
      );
    }
  }

  function drawSquareNumberEl(sx, sy, square, text, corner = "br") {
    const isDark = theme.boardChecker && !square.isLight;
    const radius = (stackCountFontSize * 1.5) / 2;
    const cx = corner[1] === "r" ? sx + squareSize - radius : sx + radius;
    const cy = corner[0] === "b" ? sy + squareSize - radius : sy + radius;

    let isTextLight = theme.board2Dark;
    let circleFill = theme.colors.board2;
    if (hlSquares.includes(square.coord)) {
      isTextLight = theme.primaryDark;
      circleFill = theme.colors.primary;
    } else if (isDark) {
      isTextLight = theme.board1Dark;
      circleFill = theme.colors.board1;
    }

    svg.circle(cx, cy, radius, { fill: circleFill });
    svg.text(cx, cy, String(text), {
      fill: isTextLight ? theme.colors.textLight : theme.colors.textDark,
      fontSize: stackCountFontSize,
      fontFamily: options.font,
      textAnchor: "middle",
      dy: "0.35em",
    });
  }

  // Draw squares
  board.squares
    .concat()
    .reverse()
    .forEach((row) =>
      row.forEach((square) => {
        const isDark = theme.boardChecker && !square.isLight;
        const sx = squareOriginX(square);
        const sy = squareOriginY(square);

        // Base square
        if (!theme.boardStyle || theme.boardStyle === "blank") {
          svg.rect(sx, sy, squareSize, squareSize, {
            fill: theme.colors["board" + (isDark ? 2 : 1)],
          });
        } else {
          svg.rect(sx, sy, squareSize, squareSize, {
            fill: theme.colors["board" + (isDark ? 1 : 2)],
          });
          drawSquareHighlightEl(sx, sy, theme.colors["board" + (isDark ? 2 : 1)]);
        }

        // Rings
        if (theme.rings) {
          let ring = square.ring;
          if (theme.fromCenter) {
            ring = Math.round(board.size / 2) - ring + 1;
          }
          if (ring <= theme.rings) {
            drawSquareHighlightEl(
              sx,
              sy,
              theme.colors["ring" + ring],
              theme.vars["rings-opacity"]
            );
          }
        }

        // Highlighter
        if (options.highlighter && square.coord in options.highlighter) {
          drawSquareHighlightEl(
            sx,
            sy,
            withAlpha(options.highlighter[square.coord], 0.75)
          );
        } else if (options.hlSquares && hlSquares.includes(square.coord)) {
          const alphas = [0.4, 0.75];
          if (!options.plyIsDone) alphas.reverse();
          drawSquareHighlightEl(
            sx,
            sy,
            withAlpha(
              theme.colors.primary,
              hlSquares.length > 1 && square.coord === hlSquares[0]
                ? alphas[0]
                : alphas[1]
            )
          );
        }

        // Roads
        if (options.showRoads && square.connected.length && !board.isGameEndFlats) {
          square.connected.forEach((side) => {
            const coords = sideCoords[side];
            svg.rect(sx + coords[0], sy + coords[1], roadSize, roadSize, {
              fill: withAlpha(
                theme.colors[`player${square.color}road`],
                square.roads[side] ? 0.8 : 0.2
              ),
            });
          });
          svg.rect(
            sx + (squareSize - roadSize) / 2,
            sy + (squareSize - roadSize) / 2,
            roadSize,
            roadSize,
            {
              fill: withAlpha(
                theme.colors[`player${square.color}road`],
                square.roads.length ? 0.8 : 0.2
              ),
            }
          );
        } else if (square.roads.length) {
          drawSquareHighlightEl(
            sx,
            sy,
            withAlpha(theme.colors[`player${square.color}road`], 0.35)
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
            drawSquareNumberEl(sx, sy, square, row, "tl");
          }
          if (square.edges.S) {
            drawSquareNumberEl(sx, sy, square, col, "br");
          }
        }

        // Game-end flat highlight
        if (square.piece) {
          if (board.isGameEndFlats && !square.piece.typeCode()) {
            drawSquareHighlightEl(
              sx,
              sy,
              withAlpha(theme.colors[`player${square.color}road`], 0.4)
            );
          }

          // Stack Count
          if (options.stackCounts && square.pieces.length > 1) {
            drawSquareNumberEl(sx, sy, square, square.pieces.length, "bl");
          }

          // Pieces
          square.pieces.forEach((piece) => {
            drawPieceSvg(
              svg,
              piece,
              sx + squareSize / 2,
              sy + squareSize / 2,
              board,
              options,
              theme,
              {
                squareSize,
                pieceSize,
                pieceRadius,
                pieceSpacing,
                immovableSize,
                wallSize,
                strokeWidth,
                pieceShadowId,
              }
            );
          });
        }
      })
    );
}

function drawPieceSvg(
  svg,
  piece,
  cx,
  cy,
  board,
  options,
  theme,
  { squareSize, pieceSize, pieceRadius, pieceSpacing, immovableSize, wallSize, strokeWidth, pieceShadowId }
) {
  const pieces = piece.square ? piece.square.pieces : null;
  const z = piece.z();
  const isOverLimit = pieces && pieces.length > board.size;
  const isImmovable = isOverLimit && z < pieces.length - board.size;

  let y = 0;

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
      if (z < overflow) return;
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

  const hasBorder = theme.vars["piece-border-width"] > 0;
  const borderColor = theme.colors[`player${piece.color}border`];

  if (piece.isCapstone) {
    const fillColor = theme.colors[`player${piece.color}special`];
    // Use a group with the shadow filter, then draw the circle inside
    svg.openGroup({ filter: pieceShadowId });
    svg.circle(cx, cy + y, pieceSize / 2, {
      fill: fillColor,
      stroke: hasBorder ? borderColor : undefined,
      strokeWidth: hasBorder ? strokeWidth : undefined,
    });
    svg.closeGroup();
  } else if (piece.isStanding) {
    const fillColor = theme.colors[`player${piece.color}special`];
    const angle = piece.color === 1 ? -45 : 45;
    const w = wallSize;
    const h = pieceSize;
    const rx = pieceRadius;
    svg.openGroup({
      transform: `translate(${cx},${cy + y}) rotate(${angle})`,
      filter: pieceShadowId,
    });
    svg.path(
      svg.roundRectPath(
        Math.round(-w / 2),
        Math.round(-h / 2),
        w,
        h,
        rx
      ),
      {
        fill: fillColor,
        stroke: hasBorder ? borderColor : undefined,
        strokeWidth: hasBorder ? strokeWidth : undefined,
      }
    );
    svg.closeGroup();
  } else {
    const fillColor = theme.colors[`player${piece.color}flat`];
    if (isImmovable) {
      svg.openGroup({ filter: pieceShadowId });
      svg.path(
        svg.roundRectPath(
          cx + Math.round(pieceSize / 2),
          cy + Math.round(y + pieceSize / 2 - pieceSpacing),
          immovableSize,
          pieceSpacing,
          pieceRadius / 2
        ),
        {
          fill: fillColor,
          stroke: hasBorder ? borderColor : undefined,
          strokeWidth: hasBorder ? strokeWidth : undefined,
        }
      );
      svg.closeGroup();
    } else {
      svg.openGroup({ filter: pieceShadowId });
      svg.path(
        svg.roundRectPath(
          cx + Math.round(-pieceSize / 2),
          cy + Math.round(y - pieceSize / 2),
          pieceSize,
          pieceSize,
          pieceRadius
        ),
        {
          fill: fillColor,
          stroke: hasBorder ? borderColor : undefined,
          strokeWidth: hasBorder ? strokeWidth : undefined,
        }
      );
      svg.closeGroup();
    }
  }
}

export function drawUnplayedPiecesSvg(
  svg,
  options,
  board,
  theme,
  { squareSize, pieceSize, pieceRadius, pieceSpacing, immovableSize, wallSize, strokeWidth, shadowOffset, shadowBlur, padding, axisSize, headerHeight, boardSize, boardRadius, unplayedWidth }
) {
  const pieceShadowId = "pieceShadow";

  // Background
  svg.path(
    svg.roundRectPath(
      axisSize + padding + boardSize,
      headerHeight + padding,
      unplayedWidth,
      boardSize,
      { tr: boardRadius, br: boardRadius }
    ),
    { fill: theme.colors.board3 }
  );

  [1, 2].forEach((color) => {
    const baseX =
      padding + axisSize + boardSize + (color === 2) * squareSize * 0.75 + squareSize / 2;
    const baseY =
      padding + headerHeight + boardSize - squareSize + squareSize / 2;

    ["flat", "cap"].forEach((type) => {
      const total = board.pieceCounts[color][type];
      const played = board.pieces.played[color][type].length;
      const remaining = total - played;
      const pieces = board.pieces.all[color][type].slice(total - remaining);
      if (type === "flat" && options.opening === "swap") {
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
      pieces.reverse().forEach((piece) => {
        drawPieceSvg(svg, piece, baseX, baseY, board, options, theme, {
          squareSize,
          pieceSize,
          pieceRadius,
          pieceSpacing,
          immovableSize,
          wallSize,
          strokeWidth,
          pieceShadowId,
        });
      });
    });
  });
}
