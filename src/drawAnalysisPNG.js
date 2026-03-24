import { createCanvas } from "canvas";
import { roundRect, coordToCanvas } from "./drawUtils.js";
import {
  computeArrowDrops,
  computeArrowGeometry,
  getGroupOffsets,
  groupOverlappingArrows,
  groupPlacementsByCoord,
  prepareAnalysisData,
} from "./drawAnalysis.js";

export function drawAnalysis(
  ctx,
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

    group.forEach((p, i) => {
      const cx = center.x + offsets[i].dx;
      const cy = center.y + offsets[i].dy;

      // Determine color: first move of game uses swap
      const plyColor =
        board.linenum === 1 && options.opening === "swap"
          ? board.player === 1
            ? 2
            : 1
          : board.player;

      ctx.save();
      ctx.globalAlpha = p.strength;

      if (p.move.ply.specialPiece === "C") {
        // Capstone — match HTML: r = 0.17 * scale (in square units)
        const r = Math.round(squareSize * 0.17 * scale);
        ctx.fillStyle = theme.colors[`player${plyColor}special`];
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
      } else if (p.move.ply.specialPiece === "S") {
        // Wall — match HTML: w = 0.1 * scale, h = 0.35 * scale
        const w = Math.round(squareSize * 0.1 * scale);
        const h = Math.round(squareSize * 0.35 * scale);
        const wallRx = Math.round(w * 0.15);
        ctx.fillStyle = theme.colors[`player${plyColor}special`];
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((plyColor === 1 ? -45 : 45) * Math.PI) / 180);
        roundRect(
          ctx,
          Math.round(-w / 2),
          Math.round(-h / 2),
          w,
          h,
          wallRx
        );
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Flat — match HTML: sz = 0.35 * scale, rx = sz * 0.12
        const sz = Math.round(squareSize * 0.35 * scale);
        const flatRx = Math.round(sz * 0.12);
        ctx.fillStyle = theme.colors[`player${plyColor}flat`];
        roundRect(
          ctx,
          Math.round(cx - sz / 2),
          Math.round(cy - sz / 2),
          sz,
          sz,
          flatRx
        );
        ctx.fill();
        if (ghostStrokeScaled > 0) {
          ctx.strokeStyle = theme.colors[`player${plyColor}border`];
          ctx.lineWidth = ghostStrokeScaled;
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  // Group arrows that share any edge (segment between adjacent squares)
  // in the same direction, so they can be offset perpendicularly.
  const arrowGroupMap = groupOverlappingArrows(arrows);

  // Draw movement arrows
  // Use an offscreen canvas per arrow so overlapping elements (line, head,
  // drop circles) composite at full opacity, then blit with group alpha.
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

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

    // Draw arrow elements to offscreen canvas at full opacity
    const offscreen = createCanvas(canvasW, canvasH);
    const octx = offscreen.getContext("2d");

    // Draw line
    octx.strokeStyle = arrowColor;
    octx.lineWidth = lineWidth;
    octx.lineCap = "round";
    octx.beginPath();
    octx.moveTo(x1, y1);
    octx.lineTo(baseX, baseY);
    octx.stroke();

    // Draw arrowhead
    octx.fillStyle = arrowColor;
    octx.beginPath();
    octx.moveTo(finalTipX, finalTipY);
    octx.lineTo(lx, ly);
    octx.lineTo(rx, ry);
    octx.closePath();
    octx.fill();

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

      octx.fillStyle = arrowColor;
      octx.beginPath();
      octx.moveTo(pickupTriangle.tipX, pickupTriangle.tipY);
      octx.lineTo(pickupTriangle.lx, pickupTriangle.ly);
      octx.lineTo(pickupTriangle.rx, pickupTriangle.ry);
      octx.closePath();
      octx.fill();

      if (pickupLabel) {
        octx.fillStyle = textColor;
        octx.font = `${dropFontSize}px ${options.font}`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(pickupLabel.text, pickupLabel.x, pickupLabel.y);
      }

      intermediateDrops.forEach((drop) => {
        octx.fillStyle = arrowColor;
        octx.beginPath();
        octx.arc(drop.x, drop.y, dropR, 0, 2 * Math.PI);
        octx.closePath();
        octx.fill();

        octx.fillStyle = textColor;
        octx.font = `${dropFontSize}px ${options.font}`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(drop.text, drop.x, drop.y);
      });

      if (finalDropLabel) {
        octx.fillStyle = textColor;
        octx.font = `${dropFontSize}px ${options.font}`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(finalDropLabel.text, finalDropLabel.x, finalDropLabel.y);
      }
    }

    // Composite the offscreen arrow onto the main canvas with group opacity
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  });
}
