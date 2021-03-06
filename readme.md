TPS Ninja
===

TPS to PNG - Tak Positional System to Portable Network Graphics

Install: `npm i && npm link`

Usage: `TPStoPNG [TPS|board size] [OPTION=VALUE]...`

Examples:

`TPStoPNG "x5/x5/x5/x5/2,x4 2 1" komi=1 imageSize=sm`

![Example 1](/x5-x5-x5-x5-2,x4%202%201.png)

`TPStoPNG 6 opening="no-swap" ply="a1" imageSize="sm" theme="zen"`

![Example 2](/x6-x6-x6-x6-x6-1,x5%202%201.png)

Options:

    theme          [ID|JSON] Theme
    imageSize      [xs|sm|md|lg|xl] Image size
    textSize       [xs|sm|md|lg|xl] Text size
    axisLabels     [true|false] Show board coordinate labels
    turnIndicator  [true|false] Show turn indicator and player names
    flatCounts     [true|false] Show flat counts
    komi           [-20.5, 20.5] Bonus points awarded to Player 2
    opening        [swap|no-swap] Opening variations
    pieceShadows   [true|false] Show piece shadows or an outline
    showRoads      [true|false] Show road connections
    unplayedPieces [true|false] Show unplayed pieces
    padding        [true|false] Pad the image

    name           Filename of exported PNG, defaults to TPS or game result
    player1        Name of Player 1
    player2        Name of Player 2
    hl             PTN of a ply whose affected squares will be highlighted
    ply            PTN of a ply to be executed
    caps           Override number of cap stones for both players
    flats          Override number of flat stones for both players
    caps1          Override number of cap stones for player 1
    flats1         Override number of flat stones for player 1
    caps2          Override number of cap stones for player 2
    flats2         Override number of flat stones for player 2
