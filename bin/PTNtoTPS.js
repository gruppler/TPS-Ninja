#!/usr/bin/env node

import { PTNtoTPS } from "../src/index.js";

const options = process.argv.slice(process.argv[0] === "PTNtoTPS" ? 1 : 2);
if (options.length < 2) {
  console.log(
    "Usage: PTNtoTPS <TPS|board size> [OPTION=VALUE ...] <ply1> [<ply2> ...]\n" +
      "PTN to TPS - Portable Tak Notation to Tak Positional System\n\n" +
      "Options:\n" +
      "  opening        [swap|no-swap] Opening variations\n" +
      "  caps           Override number of cap stones for both players\n" +
      "  flats          Override number of flat stones for both players\n" +
      "  caps1          Override number of cap stones for Player 1\n" +
      "  flats1         Override number of flat stones for Player 1\n" +
      "  caps2          Override number of cap stones for Player 2\n" +
      "  flats2         Override number of flat stones for Player 2\n"
  );
} else {
  try {
    console.log(PTNtoTPS(options));
  } catch (error) {
    console.error(error);
  }
}
