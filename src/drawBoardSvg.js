import {
  getPieceOutlineWidth,
  getStackOffset,
  withAlpha,
} from "./drawUtils.js";
import { isDark, compositeColors } from "./colors.js";
import { drawEvaluationBarSvg } from "./drawEvaluationBar.js";

export function drawAxisLabelsSvg(
  svg,
  options,
  board,
  theme,
  {
    fontSize,
    squareSize,
    padding,
    axisSize,
    headerHeight,
    boardSize,
    unplayedHeight,
  },
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

    // In vertical layout, column labels appear below the reserves strip
    const colLabelY =
      padding +
      headerHeight +
      boardSize +
      (options.verticalLayout ? unplayedHeight : 0) +
      (padding ? (axisSize + padding) / 2 : axisSize);

    for (let i = 0; i < board.size; i++) {
      const coord = [xAxis[i], yAxis[i]];
      // X axis (bottom)
      svg.text(
        padding + axisSize + squareSize * i + squareSize / 2,
        colLabelY,
        coord[0],
        {
          fill: fillColor,
          fontSize,
          fontFamily: options.font,
          textAnchor: "middle",
          dy: padding ? "0.35em" : "0",
          filter: filterId,
        },
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
        },
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
  hlPieces,
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
  },
) {
  // Shadow filter for pieces
  const pieceShadowId = "pieceShadow";
  svg.shadowFilter(
    pieceShadowId,
    0,
    shadowOffset,
    shadowBlur,
    theme.colors.umbra,
  );

  function isAxisLabelTextLight(square) {
    const isDiamonds3 = theme.boardStyle === "diamonds3";
    const isCheckerDark = theme.boardChecker && !square.isLight;

    let baseColor;
    if (!theme.boardStyle || theme.boardStyle === "blank") {
      baseColor = theme.colors["board" + (isCheckerDark ? 2 : 1)];
    } else if (isDiamonds3) {
      baseColor = theme.colors["board" + (isCheckerDark ? 1 : 2)];
    } else {
      baseColor = theme.colors["board" + (isCheckerDark ? 2 : 1)];
    }

    if (isDiamonds3) {
      return isDark(baseColor);
    }

    let composited = baseColor;

    if (theme.rings) {
      let ring = square.ring;
      if (theme.fromCenter) {
        ring = Math.round(board.size / 2) - ring + 1;
      }
      if (ring <= theme.rings) {
        composited = compositeColors(
          composited,
          theme.colors["ring" + ring],
          theme.vars["rings-opacity"],
        );
      }
    }

    if (options.highlighter && square.coord in options.highlighter) {
      composited = compositeColors(
        composited,
        options.highlighter[square.coord],
        0.75,
      );
    } else if (options.hlSquares && hlSquares.includes(square.coord)) {
      const alphas = [0.4, 0.75];
      if (!options.plyIsDone) alphas.reverse();
      const hlAlpha =
        hlSquares.length > 1 && square.coord === hlSquares[0]
          ? alphas[0]
          : alphas[1];
      composited = compositeColors(composited, theme.colors.primary, hlAlpha);
    }

    return isDark(composited);
  }

  function axisLabelInsetEm() {
    if (theme.boardStyle === "diamonds2" || theme.boardStyle === "grid3") {
      return 0.5;
    }
    if (theme.boardStyle === "grid2") {
      return 0.25;
    }
    return 0;
  }

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
          squareRadius,
        ),
        { fill, opacity },
      );
    }
  }

  function drawSquareNumberEl(sx, sy, square, text, corner = "br") {
    const cornerAnchor = axisLabelFontSize * 0.65;
    const inset = axisLabelFontSize * axisLabelInsetEm();
    const cx =
      (corner[1] === "r" ? sx + squareSize - cornerAnchor : sx + cornerAnchor) +
      (corner[1] === "r" ? -inset : inset);
    const cy =
      (corner[0] === "b" ? sy + squareSize - cornerAnchor : sy + cornerAnchor) +
      (corner[0] === "b" ? -inset : inset);

    const isTextLight = isAxisLabelTextLight(square);

    svg.text(cx, cy, String(text), {
      fill: isTextLight ? theme.colors.textLight : theme.colors.textDark,
      fontSize: axisLabelFontSize,
      fontFamily: options.font,
      textAnchor: "middle",
      dy: "0.35em",
    });
  }

  // Square edges are axis-aligned and meet exactly, but once the SVG is scaled
  // to a fractional pixel size, anti-aliasing blends each edge pixel with
  // whatever is behind it instead of with the neighboring square, leaving a
  // faint seam. The squares are drawn with crisp edges so neighbors snap to
  // the same pixel boundary, and over a backing in the board's own color so
  // any seam that survives is board-colored.
  svg.rect(
    padding + axisSize,
    padding + headerHeight,
    squareSize * board.size,
    squareSize * board.size,
    {
      fill: theme.colors[
        !theme.boardStyle || theme.boardStyle === "blank" ? "board1" : "board2"
      ],
      crisp: true,
    },
  );

  // Draw squares
  board.squares
    .concat()
    .reverse()
    .forEach((row) =>
      row.forEach((square) => {
        const isDark = theme.boardChecker && !square.isLight;
        const sx = squareOriginX(square);
        const sy = squareOriginY(square);

        // Squares that fill their cell are flattened into a single opaque
        // rect: the translucent overlays (rings, highlights) would otherwise
        // be anti-aliased separately on either side of every shared edge,
        // leaving a faint seam between squares when the SVG is scaled.
        const isPlain = !squareMargin && !squareRadius;
        let plainFill = null;
        const paint = (fill, opacity) => {
          if (isPlain) {
            plainFill = compositeColors(plainFill, fill, opacity);
          } else {
            drawSquareHighlightEl(sx, sy, fill, opacity);
          }
        };

        // Base square
        if (!theme.boardStyle || theme.boardStyle === "blank") {
          const fill = theme.colors["board" + (isDark ? 2 : 1)];
          if (isPlain) {
            plainFill = fill;
          } else {
            svg.rect(sx, sy, squareSize, squareSize, { fill, crisp: true });
          }
        } else {
          const fill = theme.colors["board" + (isDark ? 1 : 2)];
          if (isPlain) {
            plainFill = fill;
          } else {
            svg.rect(sx, sy, squareSize, squareSize, { fill, crisp: true });
          }
          paint(theme.colors["board" + (isDark ? 2 : 1)]);
        }

        // Rings
        if (theme.rings) {
          let ring = square.ring;
          if (theme.fromCenter) {
            ring = Math.round(board.size / 2) - ring + 1;
          }
          if (ring <= theme.rings) {
            paint(theme.colors["ring" + ring], theme.vars["rings-opacity"]);
          }
        }

        // Highlighter
        if (options.highlighter && square.coord in options.highlighter) {
          paint(withAlpha(options.highlighter[square.coord], 0.75));
        } else if (options.hlSquares && hlSquares.includes(square.coord)) {
          const alphas = [0.4, 0.75];
          if (!options.plyIsDone) alphas.reverse();
          paint(
            withAlpha(
              theme.colors.primary,
              hlSquares.length > 1 && square.coord === hlSquares[0]
                ? alphas[0]
                : alphas[1],
            ),
          );
        }

        if (isPlain) {
          svg.rect(sx, sy, squareSize, squareSize, {
            fill: plainFill,
            crisp: true,
          });
        }

        // Roads
        if (
          options.showRoads &&
          square.connected.length &&
          !board.isGameEndFlats
        ) {
          square.connected.forEach((side) => {
            const coords = sideCoords[side];
            svg.rect(sx + coords[0], sy + coords[1], roadSize, roadSize, {
              fill: withAlpha(
                theme.colors[`player${square.color}road`],
                square.roads[side] ? 0.8 : 0.2,
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
                square.roads.length ? 0.8 : 0.2,
              ),
            },
          );
        } else if (square.roads.length) {
          square.roads.forEach((side) => {
            const coords = sideCoords[side];
            svg.rect(sx + coords[0], sy + coords[1], roadSize, roadSize, {
              fill: withAlpha(theme.colors[`player${square.color}road`], 0.8),
            });
          });
          svg.rect(
            sx + (squareSize - roadSize) / 2,
            sy + (squareSize - roadSize) / 2,
            roadSize,
            roadSize,
            {
              fill: withAlpha(theme.colors[`player${square.color}road`], 0.8),
            },
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
          if (
            board.isGameEndFlats &&
            !options.hideFlatWinHighlights &&
            !square.piece.typeCode()
          ) {
            drawSquareHighlightEl(
              sx,
              sy,
              withAlpha(theme.colors[`player${square.color}road`], 0.4),
            );
          }

          // Outline the pieces the last ply moved. All of a square's outlines
          // are drawn before the first of those pieces, so that the pieces
          // then cover everything but the rim around the group, and the group
          // gets a single outline rather than one per piece.
          const outlined = square.pieces.filter((piece) =>
            hlPieces.includes(piece),
          );
          const drawPieceOutlines = () =>
            outlined.forEach((piece) => {
              const offset = getStackOffset(piece, board, pieceSpacing);
              if (offset && !offset.isImmovable) {
                drawPieceShapeSvg(
                  svg,
                  piece,
                  sx + squareSize / 2,
                  sy + squareSize / 2 + offset.y,
                  false,
                  {
                    pieceSize,
                    pieceRadius,
                    pieceSpacing,
                    immovableSize,
                    wallSize,
                  },
                  {
                    fill: "none",
                    stroke: theme.colors.primary,
                    strokeWidth:
                      strokeWidth + getPieceOutlineWidth(squareSize) * 2,
                  },
                );
              }
            });

          // Pieces
          square.pieces.forEach((piece) => {
            if (piece === outlined[0]) {
              drawPieceOutlines();
            }
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
                stackCountFontSize,
                axisLabelInsetPx: axisLabelFontSize * axisLabelInsetEm(),
                isAxisLabelTextLight,
              },
            );
          });
        }
      }),
    );
}

// Draw a piece's shape around (cx, cy), in the given style
function drawPieceShapeSvg(
  svg,
  piece,
  cx,
  cy,
  isImmovable,
  { pieceSize, pieceRadius, pieceSpacing, immovableSize, wallSize },
  style,
  filter,
) {
  if (piece.isCapstone) {
    // Use a group with the shadow filter, then draw the circle inside
    svg.openGroup({ filter });
    svg.circle(cx, cy, pieceSize / 2, style);
    svg.closeGroup();
  } else if (piece.isStanding) {
    svg.openGroup({
      transform: `translate(${cx},${cy}) rotate(${piece.color === 1 ? -45 : 45})`,
      filter,
    });
    svg.path(
      svg.roundRectPath(
        Math.round(-wallSize / 2),
        Math.round(-pieceSize / 2),
        wallSize,
        pieceSize,
        pieceRadius,
      ),
      style,
    );
    svg.closeGroup();
  } else {
    svg.openGroup({ filter });
    svg.path(
      isImmovable
        ? svg.roundRectPath(
            cx + Math.round(pieceSize / 2),
            cy + Math.round(pieceSize / 2 - pieceSpacing),
            immovableSize,
            pieceSpacing,
            pieceRadius / 2,
          )
        : svg.roundRectPath(
            cx + Math.round(-pieceSize / 2),
            cy + Math.round(-pieceSize / 2),
            pieceSize,
            pieceSize,
            pieceRadius,
          ),
      style,
    );
    svg.closeGroup();
  }
}

function drawPieceSvg(
  svg,
  piece,
  cx,
  cy,
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
    stackCountFontSize,
    axisLabelInsetPx = 0,
    isAxisLabelTextLight,
  },
) {
  const pieces = piece.square ? piece.square.pieces : null;
  const z = piece.z();

  let y = 0;
  let isImmovable = false;

  if (piece.square) {
    // Played
    const stackOffset = getStackOffset(piece, board, pieceSpacing);
    if (!stackOffset) return;
    ({ y, isImmovable } = stackOffset);
  } else {
    // Unplayed
    const isDBS = options.opening === "double black stack";
    const isSwapOpening = options.opening === "swap" || isDBS;
    let stackColor = piece.color;
    let stackIndex = piece.index;
    if (isSwapOpening && !piece.isCapstone) {
      if (piece.index === 0) {
        stackColor = piece.color === 1 ? 2 : 1;
      } else if (isDBS && piece.color === 2 && piece.index === 1) {
        stackColor = 1;
      }
      if (isDBS) {
        if (piece.color === 1 && stackColor === 1) {
          stackIndex = piece.index + 1;
        } else if (piece.color === 2 && stackColor === 2) {
          stackIndex = piece.index + 1;
        }
      }
    }
    const caps = board.pieceCounts[stackColor].cap;
    const total = board.pieceCounts[stackColor].total;
    // In DBS mode, own-color pieces are shifted by +1 in stackIndex,
    // so the maximum stackIndex reaches total (instead of total - 1).
    // Adding +1 to numerator and denominator rescales positions so that
    // the bottom piece sits at the baseline without overflow.
    const dbsExtra = isDBS ? 1 : 0;
    y = board.size - 1;
    if (piece.isCapstone) {
      y *= total - stackIndex - 1 + dbsExtra;
    } else {
      y *= total - stackIndex - caps - 1 + dbsExtra;
    }
    y *= -squareSize / (total - 1 + dbsExtra);
  }

  y = Math.round(y);

  const hasBorder = theme.vars["piece-border-width"] > 0;
  const borderColor = theme.colors[`player${piece.color}border`];

  drawPieceShapeSvg(
    svg,
    piece,
    cx,
    cy + y,
    isImmovable,
    { pieceSize, pieceRadius, pieceSpacing, immovableSize, wallSize },
    {
      fill: theme.colors[
        `player${piece.color}${
          piece.isCapstone || piece.isStanding ? "special" : "flat"
        }`
      ],
      stroke: hasBorder ? borderColor : undefined,
      strokeWidth: hasBorder ? strokeWidth : undefined,
    },
    pieceShadowId,
  );

  // Stack Count (only on top piece)
  const isTopPiece = pieces && z === pieces.length - 1;
  if (options.stackCounts && isTopPiece && pieces.length > 1) {
    let textFill;
    let textX = cx;
    let textY = cy + y;
    if (!options.centerStackCounts) {
      const cornerAnchor = stackCountFontSize * 0.65;
      textX = cx + squareSize / 2 - cornerAnchor - axisLabelInsetPx;
      textY = cy + squareSize / 2 - cornerAnchor - axisLabelInsetPx;
      const isTextLight = isAxisLabelTextLight
        ? isAxisLabelTextLight(piece.square)
        : false;
      textFill = isTextLight ? theme.colors.textLight : theme.colors.textDark;
    } else {
      const darknessKey =
        piece.isCapstone || piece.isStanding
          ? `player${piece.color}SpecialDark`
          : `player${piece.color}FlatDark`;
      textFill = theme[darknessKey]
        ? theme.colors.textLight
        : theme.colors.textDark;
    }
    svg.text(textX, textY, String(pieces.length), {
      fill: textFill,
      fontSize: stackCountFontSize,
      fontFamily: options.font,
      textAnchor: "middle",
      dy: "0.35em",
    });
  }
}

function applySwapOpeningPiecesSvg(pieces, board, options, color, type) {
  const isDBS = options.opening === "double black stack";
  const isSwapOpening = options.opening === "swap" || isDBS;
  if (type !== "flat" || !isSwapOpening) return;
  const played = board.pieces.played[color][type].length;
  if (color === 1) {
    if (!board.pieces.played[2][type].length) {
      pieces[0] = board.pieces.all[2][type][0];
      if (isDBS && board.pieces.all[2][type][1]) {
        pieces.splice(1, 0, board.pieces.all[2][type][1]);
      }
    } else if (isDBS && board.pieces.played[2][type].length < 2) {
      pieces[0] = board.pieces.all[2][type][1];
    } else if (!played) {
      pieces.shift();
    }
  } else {
    if (!board.pieces.played[1][type].length) {
      if (!board.pieces.played[2][type].length) {
        pieces[0] = board.pieces.all[1][type][0];
      } else {
        pieces.unshift(board.pieces.all[1][type][0]);
      }
    }
    if (isDBS) {
      const dbs = board.pieces.all[2][type][1];
      const dbsIdx = pieces.indexOf(dbs);
      if (dbsIdx >= 0) pieces.splice(dbsIdx, 1);
    }
  }
}

// The panel behind the unplayed pieces shares an edge with the board. The
// board's edge is crisp and the panel's is anti-aliased, so once the SVG is
// scaled to a fractional size the two can land on different sides of a pixel,
// leaving a line of background between them. The panel is drawn before the
// board and runs underneath it, so the board's own edge is the only one there.
export function drawUnplayedPanelSvg(svg, options, theme, dims) {
  const {
    padding,
    axisSize,
    headerHeight,
    boardSize,
    boardRadius,
    unplayedWidth,
    unplayedHeight,
  } = dims;

  svg.path(
    svg.roundRectPath(
      axisSize + padding,
      headerHeight + padding,
      boardSize + (options.verticalLayout ? 0 : unplayedWidth),
      boardSize + (options.verticalLayout ? unplayedHeight : 0),
      options.verticalLayout
        ? { bl: boardRadius, br: boardRadius }
        : { tr: boardRadius, br: boardRadius },
    ),
    { fill: theme.colors.board3 },
  );

  drawEvaluationBarSvg(svg, options, theme, dims);
}

export function drawUnplayedPiecesSvg(svg, options, board, theme, dims) {
  const {
    squareSize,
    pieceSize,
    pieceRadius,
    pieceSpacing,
    immovableSize,
    wallSize,
    strokeWidth,
    shadowOffset,
    shadowBlur,
    padding,
    axisSize,
    headerHeight,
    boardSize,
    unplayedHeight,
  } = dims;
  const pieceShadowId = "pieceShadow";

  if (options.verticalLayout) {
    const isDBS = options.opening === "double black stack";
    const panelCenterY = Math.round(
      padding + headerHeight + boardSize + unplayedHeight / 2,
    );
    const boardLeftX = padding + axisSize;
    const scale = board.size / 2 - 1 + 0.125;

    const allPiecesToDraw = [];
    [1, 2].forEach((color) => {
      ["flat", "cap"].forEach((type) => {
        const total = board.pieceCounts[color][type];
        const played = board.pieces.played[color][type].length;
        const remaining = total - played;
        const pieces = board.pieces.all[color][type].slice(total - remaining);
        applySwapOpeningPiecesSvg(pieces, board, options, color, type);

        pieces.forEach((piece) => {
          if (!piece) return;
          const isDBS2 = options.opening === "double black stack";
          const isSwapOpening = options.opening === "swap" || isDBS2;
          let stackColor = piece.color;
          let stackIndex = piece.index;
          if (isSwapOpening && !piece.isCapstone) {
            if (piece.index === 0) stackColor = piece.color === 1 ? 2 : 1;
            else if (isDBS2 && piece.color === 2 && piece.index === 1)
              stackColor = 1;
            if (isDBS2) {
              if (piece.color === 1 && stackColor === 1)
                stackIndex = piece.index + 1;
              else if (piece.color === 2 && stackColor === 2)
                stackIndex = piece.index + 1;
            }
          }
          const totalSC = board.pieceCounts[stackColor].total;
          const capsSC = board.pieceCounts[stackColor].cap;
          const dbsX = isDBS2 ? 1 : 0;
          const denom = Math.max(1, totalSC - 1 + dbsX);
          let ratio;
          if (piece.isCapstone) {
            ratio = (totalSC - stackIndex - 1 + dbsX) / denom;
          } else {
            ratio = (totalSC - stackIndex - capsSC - 1 + dbsX) / denom;
          }
          ratio = Math.max(0, Math.min(1, ratio));
          const xBase = scale * ratio;
          let xInSquares;
          if (stackColor === 1) {
            xInSquares = scale - xBase;
          } else {
            xInSquares = board.size / 2 - 0.125 + xBase;
          }
          const cx = Math.round(
            boardLeftX + xInSquares * squareSize + squareSize / 2,
          );
          allPiecesToDraw.push({ piece, cx, cy: panelCenterY, ratio });
        });
      });
    });

    // Sort ascending so innermost (ratio=0) are drawn first (behind) and cap/outermost (ratio=1) last (on top)
    allPiecesToDraw.sort((a, b) => a.ratio - b.ratio);

    const hasBorder = theme.vars["piece-border-width"] > 0;
    allPiecesToDraw.forEach(({ piece, cx, cy }) => {
      const borderColor = theme.colors[`player${piece.color}border`];
      if (piece.isCapstone) {
        svg.openGroup({ filter: pieceShadowId });
        svg.circle(cx, cy, pieceSize / 2, {
          fill: theme.colors[`player${piece.color}special`],
          stroke: hasBorder ? borderColor : undefined,
          strokeWidth: hasBorder ? strokeWidth : undefined,
        });
        svg.closeGroup();
      } else {
        svg.openGroup({ filter: pieceShadowId });
        svg.path(
          svg.roundRectPath(
            cx - Math.round(pieceSize / 2),
            cy - Math.round(pieceSize / 2),
            pieceSize,
            pieceSize,
            pieceRadius,
          ),
          {
            fill: theme.colors[`player${piece.color}flat`],
            stroke: hasBorder ? borderColor : undefined,
            strokeWidth: hasBorder ? strokeWidth : undefined,
          },
        );
        svg.closeGroup();
      }
    });
    return;
  }

  // Horizontal layout (original)
  [1, 2].forEach((color) => {
    const baseX =
      padding +
      axisSize +
      boardSize +
      (color === 2) * squareSize * 0.75 +
      squareSize / 2;
    const baseY =
      padding + headerHeight + boardSize - squareSize + squareSize / 2;

    ["flat", "cap"].forEach((type) => {
      const total = board.pieceCounts[color][type];
      const played = board.pieces.played[color][type].length;
      const remaining = total - played;
      const pieces = board.pieces.all[color][type].slice(total - remaining);
      applySwapOpeningPiecesSvg(pieces, board, options, color, type);
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
          axisLabelInsetPx: 0,
        });
      });
    });
  });
}
