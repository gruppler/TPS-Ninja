import { coordToCanvas } from "./drawUtils.js";
import {
  computeArrowDrops,
  computeArrowGeometry,
  getGroupOffsets,
  groupOverlappingArrows,
  groupPlacementsByCoord,
  prepareAnalysisData,
} from "./drawAnalysis.js";

export function drawAnalysisSvg(
  svg,
  options,
  board,
  theme,
  { squareSize, pieceSize, pieceRadius, strokeWidth, padding, axisSize, headerHeight }
) {
  const prepared = prepareAnalysisData(options, board, {
    squareSize,
    padding,
    axisSize,
    headerHeight,
  });
  if (!prepared) return;

  const { layoutParams, placements, arrows, getStackHeight, getStackInfo } = prepared;

  const ghostStrokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.013 * 0.5
  );

  // Group placements by target square
  const placementGroups = groupPlacementsByCoord(placements);

  for (const coord in placementGroups) {
    const group = placementGroups[coord];
    const center = coordToCanvas(coord, layoutParams);
    const offsets = getGroupOffsets(group.length, squareSize);
    const scale = 0.75;
    const ghostStrokeScaled = Math.round(ghostStrokeWidth * scale);
    const hasBorder = ghostStrokeScaled > 0;

    group.forEach((p, i) => {
      const cx = center.x + offsets[i].dx;
      const cy = center.y + offsets[i].dy;

      const plyColor =
        board.linenum === 1 && options.opening === "swap"
          ? board.player === 1
            ? 2
            : 1
          : board.player;

      const borderColor = theme.colors[`player${plyColor}border`];

      if (p.move.ply.specialPiece === "C") {
        const r = Math.round(squareSize * 0.17 * scale);
        svg.circle(cx, cy, r, {
          fill: theme.colors[`player${plyColor}special`],
          stroke: hasBorder ? borderColor : undefined,
          strokeWidth: hasBorder ? ghostStrokeScaled : undefined,
          opacity: p.strength,
        });
      } else if (p.move.ply.specialPiece === "S") {
        const w = Math.round(squareSize * 0.1 * scale);
        const h = Math.round(squareSize * 0.35 * scale);
        const wallRx = Math.round(w * 0.15);
        const angle = plyColor === 1 ? -45 : 45;
        svg.openGroup({
          transform: `translate(${cx},${cy}) rotate(${angle})`,
          opacity: p.strength,
        });
        svg.path(
          svg.roundRectPath(Math.round(-w / 2), Math.round(-h / 2), w, h, wallRx),
          {
            fill: theme.colors[`player${plyColor}special`],
            stroke: hasBorder ? borderColor : undefined,
            strokeWidth: hasBorder ? ghostStrokeScaled : undefined,
          }
        );
        svg.closeGroup();
      } else {
        const sz = Math.round(squareSize * 0.35 * scale);
        const flatRx = Math.round(sz * 0.12);
        svg.path(
          svg.roundRectPath(Math.round(cx - sz / 2), Math.round(cy - sz / 2), sz, sz, flatRx),
          {
            fill: theme.colors[`player${plyColor}flat`],
            stroke: hasBorder ? borderColor : undefined,
            strokeWidth: hasBorder ? ghostStrokeScaled : undefined,
            opacity: p.strength,
          }
        );
      }
    });
  }

  // Group overlapping arrows
  const arrowGroupMap = groupOverlappingArrows(arrows);

  // Draw movement arrows
  arrows.forEach(({ move, strength }) => {
    const geometry = computeArrowGeometry(
      move,
      arrowGroupMap,
      layoutParams,
      squareSize,
      getStackInfo
    );
    if (!geometry) return;

    const {
      ply,
      x1,
      y1,
      baseX,
      baseY,
      finalTipX,
      finalTipY,
      lx,
      ly,
      rx,
      ry,
      lineWidth,
    } = geometry;
    const plyColor = board.player;

    const arrowColor = theme.colors[`player${plyColor}flat`];
    const textColor = theme[`player${plyColor}FlatDark`]
      ? theme.colors.textLight
      : theme.colors.textDark;

    // Wrap entire arrow in a group with opacity
    svg.openGroup({ opacity: strength });

    // Line
    svg.line(x1, y1, baseX, baseY, {
      stroke: arrowColor,
      strokeWidth: lineWidth,
      lineCap: "round",
    });

    // Arrowhead
    svg.polygon(
      [[finalTipX, finalTipY], [lx, ly], [rx, ry]],
      { fill: arrowColor }
    );

    const drops = computeArrowDrops(
      geometry,
      layoutParams,
      squareSize,
      getStackHeight
    );
    if (drops) {
      const {
        dropR,
        dropFontSize,
        pickupTriangle,
        pickupLabel,
        intermediateDrops,
        finalDropLabel,
      } = drops;

      svg.polygon(
        [
          [pickupTriangle.tipX, pickupTriangle.tipY],
          [pickupTriangle.lx, pickupTriangle.ly],
          [pickupTriangle.rx, pickupTriangle.ry],
        ],
        { fill: arrowColor }
      );

      if (pickupLabel) {
        svg.text(pickupLabel.x, pickupLabel.y, pickupLabel.text, {
          fill: textColor,
          fontSize: dropFontSize,
          fontFamily: options.font,
          textAnchor: "middle",
          dy: "0.35em",
        });
      }

      intermediateDrops.forEach((drop) => {
        svg.circle(drop.x, drop.y, dropR, { fill: arrowColor });
        svg.text(drop.x, drop.y, drop.text, {
          fill: textColor,
          fontSize: dropFontSize,
          fontFamily: options.font,
          textAnchor: "middle",
          dy: "0.35em",
        });
      });

      if (finalDropLabel) {
        svg.text(finalDropLabel.x, finalDropLabel.y, finalDropLabel.text, {
          fill: textColor,
          fontSize: dropFontSize,
          fontFamily: options.font,
          textAnchor: "middle",
          dy: "0.35em",
        });
      }
    }

    svg.closeGroup();
  });
}
