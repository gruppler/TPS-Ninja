TPS Ninja
===

**Install for global CLI usage:** `npm i && npm link`

---

## PTN to TPS
*Portable Tak Notation to Tak Positional System*

**Usage:** `PTNtoTPS <TPS|board size> [OPTION=VALUE ...] <ply1> [<ply2> ...]`

### Examples:

```
$ PTNtoTPS "x5/x5/x5/x5/2,x4 2 1" a5 b5 c5
> 1,1,2,x2/x5/x5/x5/2,x4 1 3
```

```
$ PTNtoTPS 6 opening=no-swap a6 b6 c6
> 1,2,1,x3/x6/x6/x6/x6/x6 2 2
```

### Options:
```
opening        [swap|no-swap] Opening variations
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for player 1
flats1         Override number of flat stones for player 1
caps2          Override number of cap stones for player 2
flats2         Override number of flat stones for player
```

---

## TPS to PNG
*Tak Positional System to Portable Network Graphics*

**Usage:** `TPStoPNG <TPS|board size> [OPTION=VALUE ...]`

### Examples:

`$ TPStoPNG "1,1,12,x2/x5/x5/x5/2,x4 1 4" komi=1 imageSize=sm name=example1`

![Example 1](/example1.png)

*Output: example1.png*

`$ TPStoPNG 6 opening=no-swap ply=a6 imageSize=sm theme=zen bgAlpha=0 name=example2`

![Example 2](/example2.png)

*Output: example2.png*

### Options:
```
theme          [ID|JSON] Theme
imageSize      [xs|sm|md|lg|xl] Image size
textSize       [xs|sm|md|lg|xl] Text size
bgAlpha        [0, 1] Background opacity
axisLabels     [true|false] Show board coordinate labels
turnIndicator  [true|false] Show turn indicator and player names
flatCounts     [true|false] Show flat counts
stackCounts    [true|false] Show stack counts
moveNumber     [true|false|<number>] Show current move number
komi           [-4.5, 4.5] Bonus points awarded to Player 2
opening        [swap|no-swap] Opening variations
showRoads      [true|false] Show road connections
unplayedPieces [true|false] Show unplayed pieces
padding        [true|false] Pad the image

name           Filename of exported PNG, defaults to 'takboard.png'
player1        Name of Player 1
player2        Name of Player 2
hl             PTN of a ply whose affected squares will be highlighted
ply            PTN of a ply to be executed
plies          Space- or comma-separated string of plies to be executed
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for player 1
flats1         Override number of flat stones for player 1
caps2          Override number of cap stones for player 2
flats2         Override number of flat stones for player 2
```

## TPS to GIF
*Tak Positional System to Graphics Interchange Format*

**Usage:** `TPStoGIF <TPS|board size> [OPTION=VALUE ...]`

### Examples:

`$ TPStoGIF 3 plies="a1 b1 b2 b3 c2 b3- b3 2b2- c1 c3 b2" theme=discord imageSize=sm name=example3`

![Example 1](/example3.gif)

*Output: example3.gif*

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
komi           [-4.5, 4.5] Bonus points awarded to Player 2
opening        [swap|no-swap] Opening variations
showRoads      [true|false] Show road connections
unplayedPieces [true|false] Show unplayed pieces
padding        [true|false] Pad the image

name           Filename of exported PNG, defaults to 'takboard.gif'
player1        Name of Player 1
player2        Name of Player 2
hl             PTN of a ply whose affected squares will be highlighted
ply            PTN of a ply to be executed
plies          Space- or comma-separated string of plies to be executed
caps           Override number of cap stones for both players
flats          Override number of flat stones for both players
caps1          Override number of cap stones for player 1
flats1         Override number of flat stones for player 1
caps2          Override number of cap stones for player 2
flats2         Override number of flat stones for player 2
```
