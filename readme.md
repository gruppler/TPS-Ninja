# TPS Ninja

**Install for including in JavaScript project:**

```bash
npm i --save 'tps-ninja'
```

or

```bash
yarn add 'tps-ninja'
```

then

```js
import { PTNtoTPS, TPStoPNG, TPStoGIF } from "tps-ninja";
```

---

**Install for global CLI usage:**

```bash
npm i -g tps-ninja
```

OR

Download the project, `cd` into its directory, then...

```bash
npm i && npm link
```

---

## PTN to TPS

_Portable Tak Notation to Tak Positional System_

### JS Usage:

```js
const tps = PTNtoTPS({ plies, [tps or size], [...options] });
```

Required options are `plies` and either `tps` or `size`.

**Examples:**

```js
PTNtoTPS({ tps: "x5/x5/x5/x5/2,x4 2 1", plies: ["a5", "b5", "c5"] });
// Returns "1,1,2,x2/x5/x5/x5/2,x4 1 3"
```

```js
PTNtoTPS({ size: 6, plies: ["a6", "b6", "c6"], opening: "no-swap" });
// Returns "1,2,1,x3/x6/x6/x6/x6/x6 2 2"
```

### CLI Usage:

```bash
PTNtoTPS <TPS|board size> [OPTION=VALUE ...] <ply1> [<ply2> ...]
```

**Examples:**

```bash
$ PTNtoTPS "x5/x5/x5/x5/2,x4 2 1" a5 b5 c5
> 1,1,2,x2/x5/x5/x5/2,x4 1 3
```

```bash
$ PTNtoTPS 6 opening=no-swap a6 b6 c6
> 1,2,1,x3/x6/x6/x6/x6/x6 2 2
```

### Options:

```
opening        [swap|no-swap] Opening variations
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for Player 1
flats1         Override number of flat stones for Player 1
caps2          Override number of cap stones for Player 2
flats2         Override number of flat stones for Player 2
```

---

## TPS to PNG

_Tak Positional System to Portable Network Graphics_

### JS Usage:

```js
const canvas = TPStoPNG(args, (streamTo = null));
```

The `args` argument is a map of options, of which `size` or `tps` are required.

If `streamTo` is defined, the image will be piped to the specified write stream. Otherwise, in a node environment, it will be output to `./takboard.png`. The canvas is returned either way.

The canvas returned has the following additional proprties:

- `ctx`: Canvas context
- `isGameEnd`: Boolean denoting whether the game is in a finished state
- `linenum`: Integer denoting current move number
- `player`: Integer (`1` or `2`) denoting current player
- `tps`: TPS string of current board state
- `id`: String denoting either the game result (if `isGameEnd`) or current TPS

````

### CLI Usage:

```bash
TPStoPNG <TPS|board size> [OPTION=VALUE ...]
````

### Examples:

**Example 1:**

```js
TPStoPNG({
  tps: "1,1,12,x2/x5/x5/x5/2,x4 1 4",
  komi: 1,
  imageSize: "sm",
  name: "example1",
});
```

OR

```bash
$ TPStoPNG "1,1,12,x2/x5/x5/x5/2,x4 1 4" komi=1 imageSize=sm name=example1
```

![Example 1](/example1.png)

_Output: example1.png_

**Example 2:**

```js
TPStoPNG({
  size: 6,
  opening: "no-swap",
  ply: "a6",
  imageSize: "sm",
  theme: "zen",
  bgAlpha: 0,
  name: "example2",
});
```

OR

```bash
$ TPStoPNG 6 opening=no-swap ply=a6 imageSize=sm theme=zen bgAlpha=0 name=example2
```

![Example 2](/example2.png)

_Output: example2.png_

### Options:

```
theme           [ID|JSON] Theme
imageSize       [xs|sm|md|lg|xl] Image size
textSize        [xs|sm|md|lg|xl] Text size
bgAlpha         [0, 1] Background opacity
hlSquares       [true|false] Highlight last ply's squares
axisLabels      [true|false] Show board coordinate labels
axisLabelsSmall [true|false] Show board coordinate labels inside the board
turnIndicator   [true|false] Show turn indicator and player names
flatCounts      [true|false] Show flat counts
stackCounts     [true|false] Show stack counts
moveNumber      [true|false|<number>] Show current move number
evalText        [true|false] Show current ply eval notation
komi            [half-integer] Bonus points awarded to Player 2
opening         [swap|no-swap] Opening variations
showRoads       [true|false] Show road connections
unplayedPieces  [true|false] Show unplayed pieces
padding         [true|false] Pad the image
highlighter     [JSON] Square coordinates mapped to color, overrides highlight

name           Filename of exported PNG, defaults to 'takboard.png'
player1        Name of Player 1
player2        Name of Player 2
hl             PTN of a ply whose affected squares will be highlighted
ply            PTN of a ply to be executed
plies          Space- or comma-separated string of plies to be executed
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for Player 1
flats1         Override number of flat stones for Player 1
caps2          Override number of cap stones for Player 2
flats2         Override number of flat stones for Player 2
```

## TPS to GIF

_Tak Positional System to Graphics Interchange Format_

### JS Usage:

```js
const stream = TPStoGIF(args, (streamTo = null));
```

The `args` argument is a map of options, of which `size` or `tps` are required.

If `streamTo` is defined, the image will be piped to the specified write stream. Otherwise, in a node environment, it will be output to `./takboard.gif`. The read stream is returned either way.

### CLI Usage:

```bash
TPStoGIF <TPS|board size> [OPTION=VALUE ...]
```

### Examples:

```js
TPStoGIF({
  size: 3,
  plies: ["a1", "b1", "b2", "b3", "c2", "b3-", "b3", "2b2-", "c1", "c3", "b2"],
  theme: "discord",
  imageSize: "sm",
  name: "example3",
});
```

OR

```bash
$ TPStoGIF 3 plies="a1 b1 b2 b3 c2 b3- b3 2b2- c1 c3 b2" theme=discord imageSize=sm name=example3
```

![Example 1](/example3.gif)

_Output: example3.gif_

### Options:

```
delay          [integer] Milliseconds between frames (default 1000)
theme          [ID|JSON] Theme
imageSize      [xs|sm|md|lg|xl] Image size
textSize       [xs|sm|md|lg|xl] Text size
transparent    [true|false] Transparent background
hlSquares      [true|false] Highlight last ply's squares
axisLabels     [true|false] Show board coordinate labels
turnIndicator  [true|false] Show turn indicator and player names
flatCounts     [true|false] Show flat counts
stackCounts    [true|false] Show stack counts
moveNumber     [true|false|<number>] Show current move number
evalText       [true|false] Show current ply eval notation
komi           [half-integer] Bonus points awarded to Player 2
opening        [swap|no-swap] Opening variations
showRoads      [true|false] Show road connections
unplayedPieces [true|false] Show unplayed pieces
padding        [true|false] Pad the image
highlighter    [JSON] Square coordinates mapped to color, overrides highlight

name           Filename of exported GIF, defaults to 'takboard.gif'
player1        Name of Player 1
player2        Name of Player 2
hl             PTN of a ply whose affected squares will be highlighted
ply            PTN of a ply to be executed
plies          Space- or comma-separated string of plies to be executed
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for Player 1
flats1         Override number of flat stones for Player 1
caps2          Override number of cap stones for Player 2
flats2         Override number of flat stones for Player 2
```
