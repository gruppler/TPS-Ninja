TPS Ninja
===

TPS to PNG - Tak Positional System to Portable Network Graphics

Install: `npm i && npm link`

Usage: `TPStoPNG TPS [OPTION:VALUE]...`

Options:

    size           [xs|sm|md|lg|xl] Image size
    axisLabels     [true|false] Show board coordinate labels
    flatCounts     [true|false] Show flat count indicators
    pieceShadows   [true|false] Show piece shadows or an outline
    showRoads      [true|false] Show road connections
    unplayedPieces [true|false] Show unplayed pieces
    padding        [true|false] Pad the image

    player1        Name of Player 1
    player2        Name of Player 2
    ply            PTN of a ply whose affected squares will be highlighted
    caps           Override number of cap stones for both players
    flats          Override number of flat stones for both players
    caps1          Override number of cap stones for player 1
    flats1         Override number of flat stones for player 1
    caps2          Override number of cap stones for player 2
    flats2         Override number of flat stones for player 2
