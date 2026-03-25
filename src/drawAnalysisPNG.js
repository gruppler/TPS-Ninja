import { createCanvas } from "canvas";
import { roundRect, coordToCanvas } from "./drawUtils.js";
import {
  computeArrowDrops,
  computeArrowGeometry,
  getPlayerFlatOpaqueColor,
  getStrengthScale,
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
      const strengthScale = getStrengthScale(p.strength);
      const visualScale = scale * strengthScale;

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
        const r = Math.round(squareSize * 0.17 * visualScale);
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
        const w = Math.round(squareSize * 0.1 * visualScale);
        const h = Math.round(squareSize * 0.35 * visualScale);
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
        const sz = Math.round(squareSize * 0.35 * visualScale);
        const flatRx = Math.round(sz * 0.12);
        ctx.fillStyle = getPlayerFlatOpaqueColor(theme, plyColor);
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

    const arrowColor = getPlayerFlatOpaqueColor(theme, plyColor);
    const borderColor = theme.colors[`player${plyColor}border`];
    const textColor = theme[`player${plyColor}FlatDark`]
      ? theme.colors.textLight
      : theme.colors.textDark;
    const strokeScale = getStrengthScale(strength);
    const coreLineWidth = lineWidth * strokeScale;
    const borderWidth = ghostStrokeWidth;
    const borderLineWidth = coreLineWidth + borderWidth * 2;
    const hasArrowBorder = borderWidth > 0;
    const textItems = [];

    // Draw arrow elements to offscreen canvas at full opacity
    const offscreen = createCanvas(canvasW, canvasH);
    const octx = offscreen.getContext("2d");

    // Draw border line beneath all arrow shapes
    if (hasArrowBorder) {
      octx.strokeStyle = borderColor;
      octx.lineWidth = borderLineWidth;
      octx.lineCap = "round";
      octx.beginPath();
      octx.moveTo(x1, y1);
      octx.lineTo(baseX, baseY);
      octx.stroke();
    }

    // Draw arrowhead and markers
    octx.fillStyle = arrowColor;
    if (hasArrowBorder) {
      octx.strokeStyle = borderColor;
      octx.lineWidth = borderWidth;
      octx.lineJoin = "round";
    }

    // Draw arrowhead
    octx.beginPath();
    octx.moveTo(finalTipX, finalTipY);
    octx.lineTo(lx, ly);
    octx.lineTo(rx, ry);
    octx.closePath();
    octx.fill();
    if (hasArrowBorder) octx.stroke();

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

      octx.beginPath();
      octx.moveTo(pickupTriangle.tipX, pickupTriangle.tipY);
      octx.lineTo(pickupTriangle.lx, pickupTriangle.ly);
      octx.lineTo(pickupTriangle.rx, pickupTriangle.ry);
      octx.closePath();
      octx.fill();
      if (hasArrowBorder) octx.stroke();

      if (pickupLabel) {
        textItems.push({
          x: pickupLabel.x,
          y: pickupLabel.y,
          text: pickupLabel.text,
          size: dropFontSize,
        });
      }

      intermediateDrops.forEach((drop) => {
        octx.beginPath();
        octx.arc(drop.x, drop.y, dropR, 0, 2 * Math.PI);
        octx.closePath();
        octx.fill();
        if (hasArrowBorder) octx.stroke();
        textItems.push({
          x: drop.x,
          y: drop.y,
          text: drop.text,
          size: dropFontSize,
        });
      });

      if (finalDropLabel) {
        textItems.push({
          x: finalDropLabel.x,
          y: finalDropLabel.y,
          text: finalDropLabel.text,
          size: dropFontSize,
        });
      }
    }

    // Draw core line over arrowhead/markers to cover their borders
    octx.strokeStyle = arrowColor;
    octx.lineWidth = coreLineWidth;
    octx.lineCap = "round";
    octx.beginPath();
    octx.moveTo(x1, y1);
    octx.lineTo(baseX, baseY);
    octx.stroke();

    textItems.forEach((item) => {
      octx.fillStyle = textColor;
      octx.font = `${item.size}px ${options.font}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(item.text, item.x, item.y);
    });

    // Composite the offscreen arrow onto the main canvas with group opacity
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  });
}
