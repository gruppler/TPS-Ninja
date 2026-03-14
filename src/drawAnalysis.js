import { createCanvas } from "canvas";
import { isString, isArray } from "lodash-es";
import { Ply } from "./Ply.js";
import { roundRect, coordToCanvas } from "./drawUtils.js";

export function drawAnalysis(
  ctx,
  options,
  board,
  theme,
  { squareSize, pieceSize, pieceRadius, strokeWidth, padding, axisSize, headerHeight }
) {
  const suggestions = options.suggestions;
  if (!suggestions || !suggestions.length) return;

  const size = board.size;
  const transform = options.transform || [0, 0];

  // Parse suggestions into move objects
  const moves = [];
  for (const s of suggestions) {
    try {
      let ply;
      if (isString(s)) {
        ply = new Ply(s);
      } else if (isString(s.ptn)) {
        ply = new Ply(s.ptn);
      } else if (s.ply) {
        ply = isString(s.ply) ? new Ply(s.ply) : s.ply;
      } else {
        continue;
      }
      if (transform[0] || transform[1]) {
        ply = ply.transform(size, transform);
      }
      moves.push({
        ply,
        evaluation: s.evaluation != null ? s.evaluation : null,
        nodes: s.nodes != null ? s.nodes : null,
        depth: s.depth != null ? s.depth : null,
        totalGames: s.totalGames != null ? s.totalGames : null,
        wins1: s.wins1 != null ? s.wins1 : null,
        wins2: s.wins2 != null ? s.wins2 : null,
        draws: s.draws != null ? s.draws : null,
      });
    } catch (e) {
      // Skip invalid plies
    }
  }

  if (!moves.length) return;

  // Deduplicate by ply text, keeping the superior result
  const seen = {};
  const deduped = [];
  for (const m of moves) {
    const key = m.ply.ptn.replace(/[?!'"]+$/, "");
    if (key in seen) {
      const existing = deduped[seen[key]];
      if (isSuperior(m, existing)) {
        deduped[seen[key]] = m;
      }
    } else {
      seen[key] = deduped.length;
      deduped.push(m);
    }
  }

  // Compute strengths (opacity)
  const strengths = computeStrengths(deduped, board.player);

  const layoutParams = { size, transform, squareSize, padding, axisSize, headerHeight };

  // Get stack height at a board coordinate
  function getStackHeight(coord) {
    const bx = "abcdefgh".indexOf(coord[0]);
    const by = parseInt(coord.slice(1), 10) - 1;
    if (
      bx >= 0 &&
      bx < size &&
      by >= 0 &&
      by < size &&
      board.squares[by] &&
      board.squares[by][bx]
    ) {
      return board.squares[by][bx].pieces.length;
    }
    return 0;
  }

  const ghostStrokeWidth = Math.round(
    theme.vars["piece-border-width"] * squareSize * 0.013 * 0.5
  );

  // Draw placement ghost stones
  const placements = [];
  const arrows = [];
  deduped.forEach((m, i) => {
    if (m.ply.movement) {
      arrows.push({ move: m, strength: strengths[i] });
    } else {
      placements.push({ move: m, strength: strengths[i] });
    }
  });

  // Group placements by target square
  const placementGroups = {};
  placements.forEach((p) => {
    const coord = p.move.ply.column + p.move.ply.row;
    if (!placementGroups[coord]) placementGroups[coord] = [];
    placementGroups[coord].push(p);
  });

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
    const ply = move.ply;
    const squares = ply.squares;
    if (!squares || squares.length < 2) return;

    const from = coordToCanvas(squares[0], layoutParams);
    const to = coordToCanvas(squares[squares.length - 1], layoutParams);
    const plyColor = board.player;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const ndx = dx / len;
    const ndy = dy / len;
    const px = -ndy;
    const py = ndx;

    // Perpendicular offset for overlapping arrows
    const groupInfo = arrowGroupMap.get(move);
    let perpOffset = 0;
    if (groupInfo && groupInfo.groupSize > 1) {
      const spacing = squareSize * 0.22;
      perpOffset =
        (-(groupInfo.groupSize - 1) / 2 + groupInfo.index) * spacing;
    }
    const ox = px * perpOffset;
    const oy = py * perpOffset;

    const startShorten = squareSize * 0.3;
    const endShorten = squareSize * 0.15;
    const headLen = squareSize * 0.2;
    const headHalf = squareSize * 0.1;
    const lineWidth = squareSize * 0.08;

    const tipX = to.x - ndx * endShorten + ox;
    const tipY = to.y - ndy * endShorten + oy;
    const baseX = tipX - ndx * headLen;
    const baseY = tipY - ndy * headLen;

    const x1 = from.x + ndx * startShorten + ox;
    const y1 = from.y + ndy * startShorten + oy;

    const lx = baseX + px * headHalf;
    const ly = baseY + py * headHalf;
    const rx = baseX - px * headHalf;
    const ry = baseY - py * headHalf;

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
    octx.moveTo(tipX, tipY);
    octx.lineTo(lx, ly);
    octx.lineTo(rx, ry);
    octx.closePath();
    octx.fill();

    // Drop count indicators
    const dist = ply.distribution;
    const pickup = parseInt(ply.pieceCount, 10) || 1;
    const isWholeStack = dist && dist.length === 1;
    const dropR = squareSize * 0.08;
    const dropFontSize = Math.round(squareSize * 0.1);

    if (dist && squares.length > 1) {
      const sourceHeight = getStackHeight(squares[0]);
      const showPickup = pickup > 1 || sourceHeight > 1;

      // Pickup arrowhead background
      const pCx = x1 + ndx * squareSize * 0.03;
      const pCy = y1 + ndy * squareSize * 0.03;
      const pLen = squareSize * 0.2;
      const pHalf = squareSize * 0.1;
      const pTipX = pCx + ndx * pLen * 0.6;
      const pTipY = pCy + ndy * pLen * 0.6;
      const pBackX = pCx - ndx * pLen * 0.4;
      const pBackY = pCy - ndy * pLen * 0.4;
      const plx2 = pBackX + px * pHalf;
      const ply2 = pBackY + py * pHalf;
      const prx2 = pBackX - px * pHalf;
      const pry2 = pBackY - py * pHalf;

      // Draw pickup arrowhead shape
      octx.fillStyle = arrowColor;
      octx.beginPath();
      octx.moveTo(pTipX, pTipY);
      octx.lineTo(plx2, ply2);
      octx.lineTo(prx2, pry2);
      octx.closePath();
      octx.fill();

      // Pickup count text
      if (showPickup) {
        const tCx = pBackX + (pTipX - pBackX) * 0.3;
        const tCy = pBackY + (pTipY - pBackY) * 0.3;
        octx.fillStyle = textColor;
        octx.font = `${dropFontSize}px ${options.font}`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(String(pickup), tCx, tCy);
      }

      if (!isWholeStack) {
        // Intermediate drop counts
        for (let si = 1; si < squares.length - 1; si++) {
          const count = parseInt(dist[si - 1], 10);
          if (isNaN(count)) continue;
          const sq = coordToCanvas(squares[si], layoutParams);
          const sqToX1x = sq.x - from.x;
          const sqToX1y = sq.y - from.y;
          const proj = sqToX1x * ndx + sqToX1y * ndy;
          const dropCx = from.x + ndx * proj + ox;
          const dropCy = from.y + ndy * proj + oy;

          // Circle background
          octx.fillStyle = arrowColor;
          octx.beginPath();
          octx.arc(dropCx, dropCy, dropR, 0, 2 * Math.PI);
          octx.closePath();
          octx.fill();

          // Count text
          octx.fillStyle = textColor;
          octx.font = `${dropFontSize}px ${options.font}`;
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillText(String(count), dropCx, dropCy);
        }

        // Final drop count inside arrowhead
        const lastCount = parseInt(dist[dist.length - 1], 10);
        if (!isNaN(lastCount)) {
          const hcx = baseX + (tipX - baseX) * 0.3;
          const hcy = baseY + (tipY - baseY) * 0.3;
          octx.fillStyle = textColor;
          octx.font = `${dropFontSize}px ${options.font}`;
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillText(String(lastCount), hcx, hcy);
        }
      }
    }

    // Composite the offscreen arrow onto the main canvas with group opacity
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  });
}

function isSuperior(candidate, existing) {
  const cNodes = candidate.nodes != null ? candidate.nodes : null;
  const eNodes = existing.nodes != null ? existing.nodes : null;
  const cDepth = candidate.depth != null ? candidate.depth : null;
  const eDepth = existing.depth != null ? existing.depth : null;

  if (cNodes !== null && eNodes !== null && cNodes !== eNodes) {
    return cNodes > eNodes;
  }
  if (cDepth !== null && eDepth !== null && cDepth !== eDepth) {
    return cDepth > eDepth;
  }

  const cEval =
    candidate.evaluation != null ? Math.abs(candidate.evaluation) : null;
  const eEval =
    existing.evaluation != null ? Math.abs(existing.evaluation) : null;
  if (cEval !== null && eEval !== null) {
    return cEval > eEval;
  }
  return false;
}

function computeStrengths(moves, currentPlayer) {
  const DEFAULT_OPACITY = 1.0;
  const MIN_OPACITY = 0.25;

  if (moves.length === 0) return [];
  if (moves.length === 1) return [DEFAULT_OPACITY];

  // Convert to subjective eval on 0-200 scale where higher = better for current player.
  // Engine eval: white → 100 + eval, black → 100 - eval
  // Openings win rate (0-1 from current player's POV) → winRate * 200
  const hasOpenings = moves.some((m) => m.totalGames != null && m.totalGames > 0);

  const subjEvals = moves.map((m) => {
    if (hasOpenings) {
      if (!m.totalGames || m.totalGames === 0) return 100;
      const wins = currentPlayer === 1 ? m.wins1 : m.wins2;
      const draws = m.draws || 0;
      return ((wins + draws * 0.5) / m.totalGames) * 200;
    } else {
      if (m.evaluation === null || m.evaluation === undefined) return null;
      return currentPlayer === 1 ? 100 + m.evaluation : 100 - m.evaluation;
    }
  });

  // Top suggestion (index 0) always gets DEFAULT_OPACITY.
  // Others scale relative to the top suggestion's subjective eval.
  const topEval = subjEvals[0];
  if (topEval === null || topEval === 0) {
    return moves.map(() => DEFAULT_OPACITY);
  }

  return subjEvals.map((e, i) => {
    if (i === 0) return DEFAULT_OPACITY;
    if (e === null) return MIN_OPACITY;
    return Math.max(MIN_OPACITY, DEFAULT_OPACITY * (e / topEval));
  });
}

// Groups arrows that share any edge (segment between adjacent squares)
// on the same axis. Assigns each arrow a lane so that no two arrows
// sharing an edge occupy the same lane. Returns a Map: move -> { index, groupSize }.
function groupOverlappingArrows(arrows) {
  const result = new Map();

  function getEdges(ply) {
    const sqs = ply.squares || [];
    const edges = new Set();
    for (let i = 0; i < sqs.length - 1; i++) {
      const a = sqs[i], b = sqs[i + 1];
      edges.add(a < b ? a + "-" + b : b + "-" + a);
    }
    return edges;
  }

  const byAxis = {};
  arrows.forEach(({ move }) => {
    const dir = move.ply.direction || "";
    const axis = dir === ">" || dir === "<" ? "h" : "v";
    if (!byAxis[axis]) byAxis[axis] = [];
    byAxis[axis].push(move);
  });

  for (const axis in byAxis) {
    const axisArrows = byAxis[axis];
    const edgeSets = axisArrows.map((m) => getEdges(m.ply));

    // Build edge -> list of arrow indices
    const edgeToArrows = {};
    axisArrows.forEach((_, i) => {
      for (const e of edgeSets[i]) {
        if (!edgeToArrows[e]) edgeToArrows[e] = [];
        edgeToArrows[e].push(i);
      }
    });

    // Greedy lane assignment: assign each arrow the lowest lane not
    // already taken by a neighbor on any shared edge.
    const lane = new Array(axisArrows.length).fill(-1);
    for (let i = 0; i < axisArrows.length; i++) {
      const usedLanes = new Set();
      for (const e of edgeSets[i]) {
        for (const j of edgeToArrows[e]) {
          if (j !== i && lane[j] >= 0) usedLanes.add(lane[j]);
        }
      }
      let l = 0;
      while (usedLanes.has(l)) l++;
      lane[i] = l;
    }

    // For each arrow, groupSize = max arrows on any of its edges
    for (let i = 0; i < axisArrows.length; i++) {
      let maxOnEdge = 1;
      for (const e of edgeSets[i]) {
        maxOnEdge = Math.max(maxOnEdge, edgeToArrows[e].length);
      }
      result.set(axisArrows[i], {
        index: lane[i],
        groupSize: maxOnEdge,
      });
    }
  }

  return result;
}

function getGroupOffsets(count, squareSize) {
  if (count === 1) return [{ dx: 0, dy: 0 }];

  const perRow = 2;
  const spacing = squareSize * 0.34;
  const offsets = [];
  const rows = Math.ceil(count / perRow);
  const totalHeight = (rows - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const itemsInRow = Math.min(perRow, count - row * perRow);
    const col = i % perRow;
    const rowWidth = (itemsInRow - 1) * spacing;
    const dx = -rowWidth / 2 + col * spacing;
    const dy = -totalHeight / 2 + row * spacing;
    offsets.push({ dx, dy });
  }
  return offsets;
}
