// The pieces the last ply moved, outlined with hlPieces: each gets a ring of
// its own, drawn over it at its edge, with the border going on inside it to
// the fill, all with corners concentric with an unringed piece's fill
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { TPStoCanvas, TPStoSVGString } = require("../src");
const { themes } = require("../src/themes");
const { getPieceRing } = require("../src/drawUtils");

// A stack spread over three squares, a capstone landing on top of c6's stack
const SPREAD = {
  tps: "1,1,2,1,1,2/2,1,x,2,1,1/2,221,212,1,1S,1/1,x,12221C,112S,112S,x/1,2112C,x,12,2S,11212/2,2,2,1,1,1 1 40",
  ply: "5c3+113",
  rings: 5,
};
// A stack topped by a standing stone spread onto two stacks
const WALL = {
  tps: "x6/x2,2,x3/x2,12,x3/x2,2121S,x3/x,1,x,2C,x2/x6 1 10",
  ply: "3c3+12",
  rings: 3,
};

// The square size of an "md" image of a 6x6 board
const SQUARE = 2 * Math.round((48 * 5) / 6);

const theme = (id, borderWidth) => {
  const t = JSON.parse(JSON.stringify(themes.find((t) => t.id === id)));
  if (borderWidth !== undefined) {
    t.id += "-" + borderWidth;
    t.vars["piece-border-width"] = borderWidth;
  }
  return t;
};
const THEMES = [
  ["classic", theme("classic")],
  ["paper", theme("paper")],
  ["no border", theme("classic", 0)],
];

const options = (position, theme, extra = {}) => ({
  tps: position.tps,
  ply: position.ply,
  hlPieces: true,
  theme: JSON.stringify(theme),
  ...extra,
});

const attrs = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]),
  );

// The piece shapes of an SVG in drawing order, each with the extent of its
// geometry (before stroking), in its group's frame, and the group's transform
function shapes(svg) {
  const result = [];
  const groups = [];
  for (const [tag] of svg.matchAll(/<\/?(g|path|circle)\b[^>]*>/g)) {
    if (tag.startsWith("</g")) {
      groups.pop();
      continue;
    }
    const a = attrs(tag);
    if (tag.startsWith("<g")) {
      if (!tag.endsWith("/>")) groups.push(a.transform || "");
      continue;
    }
    let box;
    let radius = null;
    if (tag.startsWith("<circle")) {
      const [cx, cy, r] = [a.cx, a.cy, a.r].map(Number);
      box = { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r };
    } else {
      const nums = [...a.d.matchAll(/-?[\d.]+/g)].map(Number);
      const xs = nums.filter((n, i) => i % 2 === 0);
      const ys = nums.filter((n, i) => i % 2 === 1);
      box = {
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys),
      };
      // The path starts at the end of the top left corner
      radius = nums[0] - box.left;
    }
    result.push({
      transform: groups.join(" "),
      fill: a.fill,
      stroke: a.stroke,
      strokeWidth: Number(a["stroke-width"] || 0),
      box,
      radius,
    });
  }
  return result;
}

const grow = (box, by) => ({
  left: box.left - by,
  top: box.top - by,
  right: box.right + by,
  bottom: box.bottom + by,
});

// The rings in an SVG, each with the piece it was drawn on and its layers:
// the ring, the border inside it (when the theme draws one) and the fill
function rings(svg, primary) {
  const all = shapes(svg);
  return all
    .map((shape, i) => ({ shape, i }))
    .filter(({ shape }) => shape.fill === primary)
    .map(({ i }) => {
      const piece = all[i - 1];
      const hasBorder = piece.strokeWidth > 0;
      return {
        piece,
        ring: all[i],
        border: hasBorder ? all[i + 1] : null,
        fill: all[hasBorder ? i + 2 : i + 1],
      };
    });
}

const SIDES = ["left", "top", "right", "bottom"];
const expectBox = (box, expected, what) =>
  SIDES.forEach((side) =>
    assert.ok(
      Math.abs(box[side] - expected[side]) < 0.01,
      `${what} ${side}: ${box[side]}, expected ${expected[side]}`,
    ),
  );
const expectClose = (actual, expected, what) =>
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `${what}: ${actual}, expected ${expected}`,
  );

for (const [name, t] of THEMES) {
  for (const position of [SPREAD, WALL]) {
    test(`SVG, ${name}, ${position.ply}: a ring on each piece, at its edge`, () => {
      const svg = TPStoSVGString(options(position, t));
      const found = rings(svg, t.colors.primary);
      assert.equal(found.length, position.rings);
      const unit = Math.max(1, Math.round(SQUARE * 0.013));
      const pieceRadius = Math.round(SQUARE * 0.05);
      for (const { piece, ring, border, fill } of found) {
        // Drawn over its piece, in the same place, with no shadow of its own
        assert.notEqual(piece.fill, "none");
        for (const layer of [ring, border, fill].filter(Boolean)) {
          assert.equal(layer.transform, piece.transform);
          assert.equal(layer.stroke, undefined);
        }
        const s = piece.strokeWidth;
        const edge = grow(piece.box, s / 2);
        expectBox(ring.box, edge, "ring");
        // The ring's thickness: the same in every theme, but leaving a third
        // of a standing stone
        const outer = edge.right - edge.left;
        const width = Math.min(
          Math.max(2, Math.round(SQUARE * 0.025)),
          piece.transform ? outer / 3 : Infinity,
        );
        // Inside it, the border goes on to the fill: what's left of it, and
        // at least a unit of it
        const left = s ? Math.max(Math.min(unit, s), s - width) : 0;
        if (s) {
          assert.equal(border.fill, piece.stroke);
          expectBox(border.box, grow(edge, -width), "border");
        } else {
          assert.equal(border, null);
        }
        assert.equal(fill.fill, piece.fill);
        expectBox(fill.box, grow(edge, -width - left), "fill");
        // Corners concentric with the fill's, which an unringed piece has
        if (piece.radius !== null) {
          const fillRadius = Math.max(0, pieceRadius - s / 2);
          expectClose(fill.radius, fillRadius, "fill corner");
          if (s) {
            expectClose(border.radius, fillRadius + left, "border corner");
          }
          expectClose(ring.radius, fillRadius + left + width, "ring corner");
          expectClose(piece.radius + s / 2, ring.radius, "piece corner");
        }
      }
    });

    test(`PNG, ${name}, ${position.ply}: nothing drawn outside the ply's pieces`, () => {
      const plain = TPStoCanvas(
        options(position, t, { hlPieces: false, hlSquares: false }),
      );
      const ringed = TPStoCanvas(options(position, t));
      assert.equal(plain.width, ringed.width);
      const a = plain
        .getContext("2d")
        .getImageData(0, 0, plain.width, plain.height).data;
      const b = ringed
        .getContext("2d")
        .getImageData(0, 0, plain.width, plain.height).data;
      // Where the ply's pieces are, from the SVG, which is laid out alike
      const svg = TPStoSVGString(options(position, t));
      const pieces = rings(svg, t.colors.primary).map(({ piece }) => {
        const m = piece.transform.match(
          /translate\(([-\d.]+),([-\d.]+)\) rotate\(([-\d.]+)\)/,
        );
        return {
          box: grow(piece.box, piece.strokeWidth / 2 + 1),
          frame: m ? m.slice(1).map(Number) : [0, 0, 0],
        };
      });
      const inside = (x, y) =>
        pieces.some(({ box, frame: [tx, ty, deg] }) => {
          const r = (-deg * Math.PI) / 180;
          const dx = x - tx;
          const dy = y - ty;
          const lx = dx * Math.cos(r) - dy * Math.sin(r);
          const ly = dx * Math.sin(r) + dy * Math.cos(r);
          return (
            lx >= box.left &&
            lx <= box.right &&
            ly >= box.top &&
            ly <= box.bottom
          );
        });
      let changed = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
          changed++;
          const x = ((i / 4) % plain.width) + 0.5;
          const y = Math.floor(i / 4 / plain.width) + 0.5;
          // Outside a piece, only its shadow may change, following its
          // rounder corners: none of the ring's color shows there
          if (!inside(x, y)) {
            const primary = t.colors.primary;
            const rgb = [1, 3, 5].map((k) =>
              parseInt(primary.substr(k, 2), 16),
            );
            const towardPrimary = [0, 1, 2].some(
              (c) =>
                Math.abs(b[i + c] - rgb[c]) < Math.abs(a[i + c] - rgb[c]) - 8,
            );
            assert.ok(
              !towardPrimary,
              `pixel ${x},${y} outside the ply's pieces took the ring's color`,
            );
          }
        }
      }
      assert.ok(changed > 0, "nothing was ringed");
    });
  }
}

test("a ring is as thick in every theme, at least 2px", () => {
  for (const strokeWidth of [0, 2, 4]) {
    assert.equal(
      getPieceRing(160, strokeWidth, 8, 30).piece.width,
      Math.round(160 * 0.025),
    );
    assert.equal(getPieceRing(20, strokeWidth, 1, 30).piece.width, 2);
  }
});

test("a standing stone keeps a third of its width unringed", () => {
  for (const [squareSize, strokeWidth, wallSize] of [
    [160, 2, 30],
    [40, 1, 8],
    [20, 0, 4],
  ]) {
    const { width } = getPieceRing(
      squareSize,
      strokeWidth,
      Math.round(squareSize * 0.05),
      wallSize,
    ).wall;
    const outer = wallSize + strokeWidth;
    assert.ok(outer - 2 * width >= outer / 3 - 1e-9);
  }
});
