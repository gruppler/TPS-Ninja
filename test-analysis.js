import { TPStoPNG } from "./src/index.js";
import fs from "fs";

// Test 1: Opening placement suggestions
const canvas1 = TPStoPNG({
  tps: "2,x5/x6/x6/x4,1,x/x6/x5,1 2 2",
  size: 6,
  opening: "swap",
  theme: "discord",
  suggestions: [
    { ptn: "c4", totalGames: 377, wins1: 206, wins2: 167, draws: 4 },
    { ptn: "e4", totalGames: 156, wins1: 93, wins2: 61, draws: 2 },
    { ptn: "d4", totalGames: 131, wins1: 92, wins2: 36, draws: 3 },
    { ptn: "a5", totalGames: 118, wins1: 53, wins2: 64, draws: 1 },
    { ptn: "e5", totalGames: 117, wins1: 58, wins2: 57, draws: 2 },
  ],
});
fs.writeFileSync("test-openings.png", canvas1.toBuffer("image/png"));
console.log("Written test-openings.png");

// Test 2: Engine suggestions with multiple placements in same square and duplicates
const canvas2 = TPStoPNG({
  tps: "2,x5/x4,1,x/x2,2,2,1,1/x3,2,x2/x5,1/x5,1 2 5",
  size: 6,
  theme: "discord",
  suggestions: [
    { ptn: "Ce6", evaluation: 21.65, depth: 11, nodes: 1350959 },
    { ptn: "Cf5", evaluation: 30.04, depth: 11, nodes: 1350959 },
    { ptn: "Cf3", evaluation: 31.85, depth: 11, nodes: 1350959 },
    { ptn: "Cf3", evaluation: 54.6, depth: 15, nodes: 403736 },
    { ptn: "f3", evaluation: 56.8, depth: 12, nodes: 403736 },
    { ptn: "Sf3", evaluation: 56.8, depth: 11, nodes: 403736 },
  ],
});
fs.writeFileSync("test-engine.png", canvas2.toBuffer("image/png"));
console.log("Written test-engine.png");

// Test 3: Spread with distribution
const canvas3 = TPStoPNG({
  tps: "2,2,2,1,1,x/1,12,12S,2222221C,1112C,x/1,2,1,212S,2,2/1,1,1,21S,2,x/x,1,1,112,1,1/x,1,x,12,2S,1 2 34",
  size: 6,
  theme: "discord",
  suggestions: [
    { ptn: "3d4<12", evaluation: 80, depth: 13, nodes: 2002958 },
    { ptn: "3d4<", evaluation: 70, depth: 13, nodes: 1667990 },
    { ptn: "e1+", evaluation: 60, depth: 13, nodes: 1667990 },
  ],
});
fs.writeFileSync("test-spread.png", canvas3.toBuffer("image/png"));
console.log("Written test-spread.png");

// Test 4: Cross-origin overlapping arrows (like 3c4> and 3b4>12)
const canvas4 = TPStoPNG({
  tps: "x6/x6/x,112,12,x3/x6/x6/x6 1 10",
  size: 6,
  theme: "discord",
  axisLabelsSmall: true,
  suggestions: [
    { ptn: "3c4>", evaluation: 30, depth: 12, nodes: 500000 },
    { ptn: "3b4>12", evaluation: 45, depth: 12, nodes: 500000 },
  ],
});
fs.writeFileSync("test-overlap.png", canvas4.toBuffer("image/png"));
console.log("Written test-overlap.png");

// Test 5: Opposite-direction arrows overlapping same squares
const canvas5b = TPStoPNG({
  tps: "x6/x6/x,112,12,x3/x6/x6/x6 1 10",
  size: 6,
  theme: "discord",
  axisLabelsSmall: true,
  suggestions: [
    { ptn: "3c4>", evaluation: 30, depth: 12, nodes: 500000 },
    { ptn: "3b4>12", evaluation: 45, depth: 12, nodes: 500000 },
    { ptn: "3c4<12", evaluation: 25, depth: 12, nodes: 500000 },
    { ptn: "3c4<", evaluation: 20, depth: 12, nodes: 500000 },
  ],
});
fs.writeFileSync("test-opposite.png", canvas5b.toBuffer("image/png"));
console.log("Written test-opposite.png");

// Test 6: Arrows sharing a square but NOT an edge (no offset needed)
const canvas5 = TPStoPNG({
  tps: "x6/x6/x,112,12,x3/x6/x6/x6 1 10",
  size: 6,
  theme: "discord",
  axisLabelsSmall: true,
  suggestions: [
    { ptn: "2b4>", evaluation: 30, depth: 12, nodes: 500000 },
    { ptn: "c4>", evaluation: 45, depth: 12, nodes: 500000 },
  ],
});
fs.writeFileSync("test-no-overlap.png", canvas5.toBuffer("image/png"));
console.log("Written test-no-overlap.png");

console.log("All tests complete!");
