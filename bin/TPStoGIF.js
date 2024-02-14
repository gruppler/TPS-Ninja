#!/usr/bin/env node

import { TPStoGIF } from "../src/index.js";

const options = process.argv.slice(process.argv[0] === "TPStoGIF" ? 1 : 2);
if (!options.length) {
  console.log(
    "Usage: TPStoGIF <TPS|board size> [OPTION=VALUE ...]\n" +
      "TPS to GIF - Tak Positional System to Graphics Interchange Format\n\n" +
      "Options:\n" +
      "  delay          [integer] Milliseconds between frames (default 1000)\n" +
      "  theme          [ID|JSON] Theme\n" +
      "  imageSize      [xs|sm|md|lg|xl] Image size\n" +
      "  textSize       [xs|sm|md|lg|xl] Text size\n" +
      "  transparent    [true|false] Transparent background\n" +
      "  hlSquares      [true|false] Highlight last ply's squares\n" +
      "  axisLabels     [true|false] Show board coordinate labels\n" +
      "  turnIndicator  [true|false] Show turn indicator and player names\n" +
      "  flatCounts     [true|false] Show flat counts\n" +
      "  stackCounts    [true|false] Show stack counts\n" +
      "  moveNumber     [true|false|<number>] Show current move number\n" +
      "  komi           [half-integer] Bonus points awarded to Player 2\n" +
      "  opening        [swap|no-swap] Opening variations\n" +
      "  showRoads      [true|false] Show road connections\n" +
      "  unplayedPieces [true|false] Show unplayed pieces\n" +
      "  padding        [true|false] Pad the image\n\n" +
      "  name           Filename of exported GIF, defaults to 'takboard.gif'\n" +
      "  player1        Name of Player 1\n" +
      "  player2        Name of Player 2\n" +
      "  hl             PTN of a ply whose affected squares will be highlighted\n" +
      "  ply            PTN of a ply to be executed\n" +
      "  plies          Space- or comma-separated string of plies to be executed\n" +
      "  caps           Override number of cap stones for both players\n" +
      "  flats          Override number of flat stones for both players\n" +
      "  caps1          Override number of cap stones for player 1\n" +
      "  flats1         Override number of flat stones for player 1\n" +
      "  caps2          Override number of cap stones for player 2\n" +
      "  flats2         Override number of flat stones for player 2\n"
  );
} else {
  try {
    TPStoGIF(options);
  } catch (error) {
    console.error(error);
  }
}
