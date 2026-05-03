import { isString } from "lodash-es";
import { Ply } from "./Ply.js";
import { coordToCanvas } from "./drawUtils.js";

export function prepareAnalysisData(
  options,
  board,
  { squareSize, padding, axisSize, headerHeight }
) {
  const suggestions = options.suggestions;
  if (!suggestions || !suggestions.length) return null;

  const size = board.size;
  const transform = options.transform || [0, 0];

  const moves = [];
  for (const suggestion of suggestions) {
    try {
      let ply;
      let originalPtn = null;

      if (isString(suggestion)) {
        originalPtn = suggestion;
        ply = new Ply(originalPtn);
      } else if (isString(suggestion.ptn)) {
        originalPtn = suggestion.ptn;
        ply = new Ply(originalPtn);
      } else if (suggestion.ply) {
        if (isString(suggestion.ply)) {
          originalPtn = suggestion.ply;
          ply = new Ply(originalPtn);
        } else {
          originalPtn = suggestion.ply.ptn || suggestion.ply.text || null;
          ply = suggestion.ply;
        }
      } else {
        continue;
      }

      if (transform[0] || transform[1]) {
        ply = ply.transform(size, transform);
      }

      moves.push({
        ply,
        boardSquares: originalPtn ? new Ply(originalPtn).squares : ply.squares,
        evaluation: suggestion.evaluation != null ? suggestion.evaluation : null,
        nodes: suggestion.nodes != null ? suggestion.nodes : null,
        depth: suggestion.depth != null ? suggestion.depth : null,
        totalGames: suggestion.totalGames != null ? suggestion.totalGames : null,
        wins1: suggestion.wins1 != null ? suggestion.wins1 : null,
        wins2: suggestion.wins2 != null ? suggestion.wins2 : null,
        draws: suggestion.draws != null ? suggestion.draws : null,
      });
    } catch (e) {
      // Skip invalid plies
    }
  }

  if (!moves.length) return null;

  const deduped = dedupeMoves(moves);
  const strengths = computeStrengths(deduped, board.player);
  const scales = computeScales(deduped, board.player);

  const placements = [];
  const arrows = [];
  deduped.forEach((move, i) => {
    if (move.ply.movement) {
      arrows.push({ move, strength: strengths[i], scale: scales[i] });
    } else {
      placements.push({ move, strength: strengths[i], scale: scales[i] });
    }
  });

  const layoutParams = {
    size,
    transform,
    squareSize,
    padding,
    axisSize,
    headerHeight,
  };

  return {
    size,
    layoutParams,
    placements,
    arrows,
    getStackHeight: createStackHeightGetter(board, size),
    getStackInfo: createStackInfoGetter(board, size),
  };
}

export function groupPlacementsByCoord(placements) {
  const placementGroups = {};

  placements.forEach((placement) => {
    const coord = placement.move.ply.column + placement.move.ply.row;
    if (!placementGroups[coord]) placementGroups[coord] = [];
    placementGroups[coord].push(placement);
  });

  return placementGroups;
}

export function getStrengthScale(strength) {
  const minOpacity = 0.2;
  const maxOpacity = 1.0;
  const minScale = 0.55;
  const maxScale = 1.0;
  const clamped = Math.min(maxOpacity, Math.max(minOpacity, strength));
  const t = (clamped - minOpacity) / (maxOpacity - minOpacity);
  const eased = t * t;
  return minScale + (maxScale - minScale) * eased;
}

export function getPlayerFlatOpaqueColor(theme, plyColor) {
  const opaqueKey = `player${plyColor}flatOpaque`;
  const opaqueColor = theme.colors[opaqueKey];
  if (opaqueColor) return opaqueColor;

  const flatColor = theme.colors[`player${plyColor}flat`];
  if (typeof flatColor !== "string") return flatColor;
  if (/^#[0-9a-f]{8}$/i.test(flatColor)) return `#${flatColor.slice(1, 7)}`;
  if (/^#[0-9a-f]{4}$/i.test(flatColor)) return `#${flatColor.slice(1, 4)}`;
  return flatColor;
}

export function computeArrowGeometry(
  move,
  arrowGroupMap,
  layoutParams,
  squareSize,
  getStackInfo,
  boardSize
) {
  const ply = move.ply;
  const squares = ply.squares;
  const boardSquares = move.boardSquares || squares;
  if (!squares || squares.length < 2) return null;

  const from = coordToCanvas(squares[0], layoutParams);
  const to = coordToCanvas(squares[squares.length - 1], layoutParams);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const ndx = dx / len;
  const ndy = dy / len;
  const px = -ndy;
  const py = ndx;

  const groupInfo = arrowGroupMap.get(move);
  let perpOffset = 0;
  if (groupInfo && groupInfo.groupSize > 1) {
    const spacing = squareSize * 0.22;
    perpOffset = (-(groupInfo.groupSize - 1) / 2 + groupInfo.index) * spacing;
  }
  const ox = px * perpOffset;
  const oy = py * perpOffset;

  const startShorten = squareSize * 0.3;
  const endShorten = squareSize * 0.15;
  const headLen = squareSize * 0.2;
  const headHalf = squareSize * 0.1;
  const lineWidth = squareSize * 0.08;
  const shaftStartInset = squareSize * 0.01;
  const stackSpacing = Math.round(squareSize * 0.07);

  const isVerticalOnScreen = Math.abs(dy) > Math.abs(dx);
  let bottomOffset = 0;

  if (isVerticalOnScreen) {
    const fromIsBottom = from.y > to.y;
    const bottomSquare = fromIsBottom
      ? boardSquares[0]
      : boardSquares[boardSquares.length - 1];
    const { stackHeight, topIsWall } = getStackInfo(bottomSquare);
    if (stackHeight > 0) {
      // Stacks taller than boardSize overflow (top piece clamps at boardSize-1 levels).
      const effectiveTop = boardSize
        ? Math.min(stackHeight - 1, boardSize - 1)
        : stackHeight - 1;
      let offset = stackSpacing * effectiveTop;
      if (topIsWall && stackHeight > 1) {
        offset -= stackSpacing;
      }
      bottomOffset = offset;
    }
  }

  const tipX = to.x - ndx * endShorten + ox;
  const tipY = to.y - ndy * endShorten + oy;
  let finalTipX = tipX;
  let finalTipY = tipY;
  let baseX = tipX - ndx * headLen;
  let baseY = tipY - ndy * headLen;
  let sourceAdvance = startShorten;

  let x1 = from.x + ndx * (sourceAdvance + shaftStartInset) + ox;
  let y1 = from.y + ndy * (sourceAdvance + shaftStartInset) + oy;

  if (isVerticalOnScreen && bottomOffset > 0) {
    if (from.y > to.y) {
      sourceAdvance = startShorten + bottomOffset;
      x1 = from.x + ndx * (sourceAdvance + shaftStartInset) + ox;
      y1 = from.y + ndy * (sourceAdvance + shaftStartInset) + oy;
    } else {
      const adjustedEndShorten = endShorten + bottomOffset;
      finalTipX = to.x - ndx * adjustedEndShorten + ox;
      finalTipY = to.y - ndy * adjustedEndShorten + oy;
      baseX = finalTipX - ndx * headLen;
      baseY = finalTipY - ndy * headLen;
    }
  }

  const lx = baseX + px * headHalf;
  const ly = baseY + py * headHalf;
  const rx = baseX - px * headHalf;
  const ry = baseY - py * headHalf;

  return {
    ply,
    squares,
    boardSquares,
    from,
    to,
    ndx,
    ndy,
    px,
    py,
    ox,
    oy,
    x1,
    y1,
    sourceAdvance,
    baseX,
    baseY,
    finalTipX,
    finalTipY,
    lx,
    ly,
    rx,
    ry,
    lineWidth,
  };
}

export function computeArrowDrops(
  geometry,
  layoutParams,
  squareSize,
  getStackHeight
) {
  const { ply, squares, boardSquares, from, ndx, ndy, px, py, ox, oy, sourceAdvance, baseX, baseY, finalTipX, finalTipY } =
    geometry;

  const dist = ply.distribution;
  if (!dist || squares.length <= 1) {
    return null;
  }

  const pickup = parseInt(ply.pieceCount, 10) || 1;
  const isWholeStack = dist.length === 1;
  const dropR = squareSize * 0.08;
  const dropFontSize = Math.round(squareSize * 0.1);

  const sourceHeight = getStackHeight(boardSquares[0]);
  const showPickup = pickup > 1 || sourceHeight > 1;

  const pCx = from.x + ox + ndx * (sourceAdvance + squareSize * 0.03);
  const pCy = from.y + oy + ndy * (sourceAdvance + squareSize * 0.03);
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

  const pickupLabel = showPickup
    ? {
        x: pBackX + (pTipX - pBackX) * 0.3,
        y: pBackY + (pTipY - pBackY) * 0.3,
        text: String(pickup),
      }
    : null;

  const intermediateDrops = [];
  if (!isWholeStack) {
    for (let si = 1; si < squares.length - 1; si++) {
      const count = parseInt(dist[si - 1], 10);
      if (isNaN(count)) continue;

      const squareCenter = coordToCanvas(squares[si], layoutParams);
      const sqToX1x = squareCenter.x - from.x;
      const sqToX1y = squareCenter.y - from.y;
      const proj = sqToX1x * ndx + sqToX1y * ndy;
      const dropCx = from.x + ndx * proj + ox;
      const dropCy = from.y + ndy * proj + oy;

      intermediateDrops.push({
        x: dropCx,
        y: dropCy,
        text: String(count),
      });
    }
  }

  let finalDropLabel = null;
  if (!isWholeStack) {
    const lastCount = parseInt(dist[dist.length - 1], 10);
    if (!isNaN(lastCount)) {
      finalDropLabel = {
        x: baseX + (finalTipX - baseX) * 0.3,
        y: baseY + (finalTipY - baseY) * 0.3,
        text: String(lastCount),
      };
    }
  }

  return {
    dropR,
    dropFontSize,
    pickupTriangle: {
      tipX: pTipX,
      tipY: pTipY,
      lx: plx2,
      ly: ply2,
      rx: prx2,
      ry: pry2,
    },
    pickupLabel,
    intermediateDrops,
    finalDropLabel,
  };
}

function dedupeMoves(moves) {
  const seen = {};
  const deduped = [];

  for (const move of moves) {
    const key = move.ply.ptn.replace(/[?!'"]+$/, "");
    if (key in seen) {
      const existing = deduped[seen[key]];
      if (isSuperior(move, existing)) {
        deduped[seen[key]] = move;
      }
    } else {
      seen[key] = deduped.length;
      deduped.push(move);
    }
  }

  return deduped;
}

function createStackHeightGetter(board, size) {
  return (coord) => {
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
  };
}

function createStackInfoGetter(board, size) {
  return (coord) => {
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
      const sq = board.squares[by][bx];
      const stackHeight = sq.pieces ? sq.pieces.length : 0;
      const topPiece = sq.piece || (sq.pieces && sq.pieces[stackHeight - 1]);
      return {
        stackHeight,
        topIsWall: Boolean(topPiece && topPiece.isStanding),
      };
    }
    return { stackHeight: 0, topIsWall: false };
  };
}

function isSuperior(candidate, existing) {
  const cNodes = candidate.nodes != null ? candidate.nodes : null;
  const eNodes = existing.nodes != null ? existing.nodes : null;
  const cDepth = candidate.depth != null ? candidate.depth : null;
  const eDepth = existing.depth != null ? existing.depth : null;

  if (cNodes !== null && eNodes !== null && cNodes !== eNodes) return cNodes > eNodes;
  if (cDepth !== null && eDepth !== null && cDepth !== eDepth) return cDepth > eDepth;

  const cEval = candidate.evaluation != null ? Math.abs(candidate.evaluation) : null;
  const eEval = existing.evaluation != null ? Math.abs(existing.evaluation) : null;
  if (cEval !== null && eEval !== null) return cEval > eEval;
  return false;
}

function hasOpeningData(moves) {
  return moves.some((move) => move.totalGames != null && move.totalGames > 0);
}

function computeSubjectiveEvals(moves, currentPlayer, isOpenings) {
  return moves.map((move) => {
    if (isOpenings) {
      if (!move.totalGames || move.totalGames === 0) return 100;
      const wins = currentPlayer === 1 ? move.wins1 : move.wins2;
      const draws = move.draws || 0;
      return ((wins + draws * 0.5) / move.totalGames) * 200;
    }
    if (move.evaluation === null || move.evaluation === undefined) return null;
    return currentPlayer === 1 ? 100 + move.evaluation : 100 - move.evaluation;
  });
}

function computeStrengths(moves, currentPlayer) {
  const DEFAULT_OPACITY = 1.0;
  const MIN_OPACITY = 0.2;
  const K = 4; // Sensitivity constant for opacity curve

  if (moves.length === 0) return [];
  if (moves.length === 1) return [DEFAULT_OPACITY];

  const isOpenings = hasOpeningData(moves);

  // For openings, opacity is based on commonality (totalGames) of each
  // move relative to the previous one, with a bounded step-down.
  if (isOpenings) {
    const MAX_OPACITY_DIFF = 0.15;
    const opacities = [];
    let prevOpacity = DEFAULT_OPACITY;
    let prevCommonality = null;
    for (let i = 0; i < moves.length; i++) {
      const commonality = Number(moves[i].totalGames) || 0;
      if (i === 0) {
        opacities.push(DEFAULT_OPACITY);
        prevCommonality = commonality;
        continue;
      }
      let opacity;
      if (!prevCommonality) {
        opacity = MIN_OPACITY;
      } else {
        const rel = commonality / prevCommonality;
        opacity = Math.max(
          prevOpacity * rel,
          prevOpacity - MAX_OPACITY_DIFF
        );
      }
      opacity = Math.min(DEFAULT_OPACITY, Math.max(MIN_OPACITY, opacity));
      opacities.push(opacity);
      prevOpacity = opacity;
      prevCommonality = commonality;
    }
    return opacities;
  }

  const subjEvals = computeSubjectiveEvals(moves, currentPlayer, false);

  // Top suggestion (index 0) always gets DEFAULT_OPACITY.
  // Others use exponential formula: 0.2 + 0.8 * e^(k * (x - B) / B)
  // This is more sensitive for moves close to best, less sensitive for blunders.
  const B = subjEvals[0];
  if (B === null || B === 0) {
    return moves.map(() => DEFAULT_OPACITY);
  }

  return subjEvals.map((x, i) => {
    if (i === 0) return DEFAULT_OPACITY;
    if (x === null) return MIN_OPACITY;
    const opacity = MIN_OPACITY + 0.8 * Math.exp((K * (x - B)) / B);
    return Math.min(DEFAULT_OPACITY, Math.max(MIN_OPACITY, opacity));
  });
}

function computeScales(moves, currentPlayer) {
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 1.0;
  const K = 5;

  if (moves.length === 0) return [];
  if (moves.length === 1) return [MAX_SCALE];

  // For openings, size is derived from opacity via getStrengthScale (the
  // shared size_function). Returning null lets the element renderers
  // fall back to getStrengthScale(strength).
  if (hasOpeningData(moves)) {
    return moves.map(() => null);
  }

  const subjEvals = computeSubjectiveEvals(moves, currentPlayer, false);
  const B = subjEvals[0];
  if (B === null || B === 0) {
    return moves.map(() => MAX_SCALE);
  }

  return subjEvals.map((x, i) => {
    if (i === 0) return MAX_SCALE;
    if (x === null) return MIN_SCALE;
    const scale =
      MIN_SCALE + (MAX_SCALE - MIN_SCALE) * Math.exp((K * (x - B)) / B);
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  });
}

export function groupOverlappingArrows(arrows) {
  const result = new Map();

  function getEdges(ply) {
    const squares = ply.squares || [];
    const edges = new Set();
    for (let i = 0; i < squares.length - 1; i++) {
      const a = squares[i];
      const b = squares[i + 1];
      edges.add(a < b ? a + "-" + b : b + "-" + a);
    }
    return edges;
  }

  const byAxis = {};
  arrows.forEach(({ move }) => {
    const direction = move.ply.direction || "";
    const axis = direction === ">" || direction === "<" ? "h" : "v";
    if (!byAxis[axis]) byAxis[axis] = [];
    byAxis[axis].push(move);
  });

  for (const axis in byAxis) {
    const axisArrows = byAxis[axis];
    const edgeSets = axisArrows.map((move) => getEdges(move.ply));

    const edgeToArrows = {};
    axisArrows.forEach((_, i) => {
      for (const edge of edgeSets[i]) {
        if (!edgeToArrows[edge]) edgeToArrows[edge] = [];
        edgeToArrows[edge].push(i);
      }
    });

    const lane = new Array(axisArrows.length).fill(-1);
    for (let i = 0; i < axisArrows.length; i++) {
      const usedLanes = new Set();
      for (const edge of edgeSets[i]) {
        for (const j of edgeToArrows[edge]) {
          if (j !== i && lane[j] >= 0) usedLanes.add(lane[j]);
        }
      }
      let laneIndex = 0;
      while (usedLanes.has(laneIndex)) laneIndex++;
      lane[i] = laneIndex;
    }

    for (let i = 0; i < axisArrows.length; i++) {
      let maxOnEdge = 1;
      for (const edge of edgeSets[i]) {
        maxOnEdge = Math.max(maxOnEdge, edgeToArrows[edge].length);
      }
      result.set(axisArrows[i], { index: lane[i], groupSize: maxOnEdge });
    }
  }

  return result;
}

export function getGroupOffsets(count, squareSize) {
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
