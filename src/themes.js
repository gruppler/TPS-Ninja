export default [
  {
    id: "classic",
    isBuiltIn: true,
    boardStyle: "blank",
    boardChecker: true,
    vars: { "piece-border-width": 1 },
    colors: {
      primary: "#8bc34a",
      secondary: "#607d8b",
      board1: "#90a4ae",
      board2: "#8a9faa",
      board3: "#78909c",
      player1: "#cfd8dc",
      player1road: "#cfd8dc",
      player1flat: "#cfd8dc",
      player1special: "#eceff1",
      player1border: "#546e7a",
      player2: "#263238",
      player2road: "#455a64",
      player2flat: "#546e7a",
      player2special: "#455a64",
      player2border: "#263238",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "aer",
    isBuiltIn: true,
    boardStyle: "diamonds1",
    boardChecker: false,
    vars: { "piece-border-width": 1 },
    colors: {
      primary: "#f0bc7d",
      secondary: "#cadede",
      board1: "#b6cdcf",
      board2: "#adc2c4",
      board3: "#b6cdcf88",
      player1: "#e9ecd1",
      player1road: "#e9ecd1",
      player1flat: "#dde0c7",
      player1special: "#f7e7b5",
      player1border: "#6c8481",
      player2: "#526e6b",
      player2road: "#526e6b",
      player2flat: "#6c8481",
      player2special: "#354a48",
      player2border: "#131c1b",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: false,
    secondaryDark: false,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: false,
  },
  {
    id: "aether",
    isBuiltIn: true,
    boardStyle: "grid1",
    boardChecker: false,
    vars: { "piece-border-width": 2 },
    colors: {
      primary: "#ffffffcc",
      secondary: "#000000",
      board1: "#000000",
      board2: "#333333",
      board3: "#00000000",
      player1: "#ffffff",
      player1road: "#ffffffcc",
      player1flat: "#ffffffcc",
      player1special: "#ffffffcc",
      player1border: "#ffffff",
      player2: "#333333",
      player2road: "#666666cc",
      player2flat: "#000000cc",
      player2special: "#000000cc",
      player2border: "#545454",
      textLight: "#ffffff",
      textDark: "#000000",
      umbra: "#000000aa",
    },
    primaryDark: false,
    secondaryDark: true,
    board1Dark: true,
    board2Dark: true,
    player1Dark: false,
    player2Dark: true,
  },
  {
    id: "aqua",
    isBuiltIn: true,
    boardStyle: "diamonds3",
    boardChecker: false,
    rings: 4,
    vars: {
      "piece-border-width": 3,
      "rings-opacity": 0.25,
    },
    colors: {
      primary: "#d7faee",
      secondary: "#00395c",
      board1: "#5cc4d6",
      board2: "#53bcdb",
      board3: "#00395c",
      player1: "#a2de30",
      player1road: "#5e9100",
      player1flat: "#9ad32e",
      player1special: "#beef43",
      player1border: "#31600e",
      player2: "#00bce4",
      player2road: "#00819e",
      player2flat: "#00b3d9",
      player2special: "#26c6e8",
      player2border: "#00667d",
      ring1: "#00000011",
      ring2: "#00000044",
      ring3: "#00000077",
      ring4: "#000000aa",
      textLight: "#c6f7e7cc",
      textDark: "#112430cc",
      umbra: "#0a233633",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: false,
  },

  {
    id: "atlas",
    isBuiltIn: true,
    boardStyle: "grid2",
    boardChecker: false,
    fromCenter: true,
    rings: 4,
    vars: {
      "piece-border-width": 1,
      "rings-opacity": 0.4,
    },
    colors: {
      primary: "#baa254",
      secondary: "#d9cfad",
      board1: "#537094",
      board2: "#3d5878",
      board3: "#3d5878",
      player1: "#fff7e8",
      player1road: "#ffffff",
      player1flat: "#fff7e8",
      player1special: "#fff7e8",
      player1border: "#634831",
      player2: "#709c81",
      player2road: "#abd6bb",
      player2flat: "#709c81",
      player2special: "#709c81",
      player2border: "#112e03",
      ring1: "#00000011",
      ring2: "#00000044",
      ring3: "#00000077",
      ring4: "#000000aa",
      textLight: "#ffffffff",
      textDark: "#634831",
      umbra: "#453c3455",
    },
    primaryDark: true,
    secondaryDark: false,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "backlit",
    isBuiltIn: true,
    boardStyle: "grid2",
    boardChecker: false,
    vars: { "piece-border-width": 2 },
    colors: {
      primary: "#6a3582",
      secondary: "#777777cc",
      board1: "#888888",
      board2: "#777777",
      board3: "#999999",
      player1: "#eeeeee",
      player1road: "#ffffff",
      player1flat: "#999999",
      player1special: "#999999",
      player1border: "#ffffff",
      player2: "#444444",
      player2road: "#000000",
      player2flat: "#777777",
      player2special: "#777777",
      player2border: "#000000",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000022",
    },
    primaryDark: true,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "bubbletron",
    isBuiltIn: true,
    boardStyle: "diamonds3",
    boardChecker: false,
    rings: 4,
    vars: {
      "piece-border-width": 2,
      "rings-opacity": 0.25,
    },
    colors: {
      primary: "#1b47f5",
      secondary: "#282033",
      board1: "#202b59",
      board2: "#282033",
      board3: "#282033",
      player1: "#e055c3",
      player1road: "#e055c3",
      player1flat: "#202b59cc",
      player1special: "#e055c3",
      player1border: "#e055c3cc",
      player2: "#50ffe1",
      player2road: "#50ffe1",
      player2flat: "#202b59cc",
      player2special: "#50ffe1",
      player2border: "#50ffe1",
      ring1: "#202b5944",
      ring2: "#9b4fff88",
      ring3: "#e0b955cc",
      ring4: "#c0e055ff",
      textLight: "#fafafacd",
      textDark: "#282033cc",
      umbra: "#28203354",
    },
    primaryDark: true,
    secondaryDark: true,
    player1Dark: true,
    player2Dark: false,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "discord",
    isBuiltIn: true,
    boardStyle: "diamonds3",
    boardChecker: false,
    rings: 4,
    vars: {
      "piece-border-width": 1,
      "rings-opacity": 0.35,
    },
    colors: {
      primary: "#faa81a",
      secondary: "#36393f",
      board1: "#727479",
      board2: "#6c6e73",
      board3: "#54575c",
      player1: "#d6d6d6",
      player1road: "#d6d6d6",
      player1flat: "#cbcbcb",
      player1special: "#c1c1c1",
      player1border: "#2d2d2d",
      player2: "#080808",
      player2road: "#2d2d2d",
      player2flat: "#2d2d2d",
      player2special: "#212121",
      player2border: "#cbcbcb",
      ring1: "#ffffff44",
      ring2: "#ffffff88",
      ring3: "#ffffffcc",
      ring4: "#ffffffff",
      textLight: "#fafafac0",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "fresh",
    isBuiltIn: true,
    boardStyle: "diamonds1",
    boardChecker: false,
    rings: 4,
    vars: {
      "piece-border-width": 2,
      "rings-opacity": 0.2,
    },
    colors: {
      primary: "#37adc4",
      secondary: "#cccccc",
      board1: "#b8b8b8",
      board2: "#adadad",
      board3: "#a0a0a0",
      player1: "#ffffff",
      player1road: "#ffffff",
      player1flat: "#f2f2f2",
      player1special: "#e6e6e6",
      player1border: "#525252",
      player2: "#333333",
      player2road: "#525252",
      player2flat: "#525252",
      player2special: "#474747",
      player2border: "#f2f2f2",
      ring1: "#00000011",
      ring2: "#00000044",
      ring3: "#00000077",
      ring4: "#000000aa",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: true,
    secondaryDark: false,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: false,
  },
  {
    id: "ignis",
    isBuiltIn: true,
    boardStyle: "diamonds1",
    boardChecker: true,
    rings: 4,
    vars: {
      "piece-border-width": 2,
      "rings-opacity": 0.4,
    },
    colors: {
      primary: "#fde577",
      secondary: "#330721",
      board1: "#b81f34aa",
      board2: "#ab1d30aa",
      board3: "#c72a4088",
      player1: "#c72a40",
      player1road: "#ff6c40",
      player1flat: "#ff6c40",
      player1special: "#fde577",
      player1border: "#fde577",
      player2: "#520833",
      player2road: "#520833",
      player2flat: "#690d42",
      player2special: "#3d193c",
      player2border: "#14000cff",
      ring1: "#52083345",
      ring2: "#ff6c4087",
      ring3: "#fde577cc",
      ring4: "#fde577ff",
      textLight: "#fff7d1cc",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: true,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "luna",
    isBuiltIn: true,
    boardStyle: "diamonds3",
    boardChecker: false,
    rings: 4,
    vars: {
      "piece-border-width": 1,
      "rings-opacity": 0.25,
    },
    colors: {
      primary: "#edd691",
      secondary: "#000000",
      board1: "#888888",
      board2: "#666666",
      board3: "#00000000",
      player1: "#ffffff",
      player1road: "#cccccc",
      player1flat: "#cccccc",
      player1special: "#ffffff",
      player1border: "#302923",
      player2: "#445366",
      player2road: "#141f2e",
      player2flat: "#4f6178",
      player2special: "#415570",
      player2border: "#0f161f",
      ring1: "#000000ff",
      ring2: "#000000cc",
      ring3: "#302923cc",
      ring4: "#7a6c5dff",
      textLight: "#fafafa99",
      textDark: "#212121cd",
      umbra: "#00000066",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: true,
  },
  {
    id: "paper",
    isBuiltIn: true,
    boardStyle: "grid1",
    boardChecker: false,
    vars: { "piece-border-width": 2 },
    colors: {
      primary: "#68c0e3",
      secondary: "#ffffff",
      board1: "#c8c8c8",
      board2: "#b8b8b8",
      board3: "#b8b8b8",
      player1: "#eeeeee",
      player1road: "#ffffff",
      player1flat: "#e8e8e8",
      player1special: "#ffffff",
      player1border: "#333333",
      player2: "#444444",
      player2road: "#606060",
      player2flat: "#606060",
      player2special: "#707070",
      player2border: "#000000",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000022",
    },
    primaryDark: false,
    secondaryDark: false,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: false,
  },
  {
    id: "retro",
    isBuiltIn: true,
    boardStyle: "grid1",
    boardChecker: false,
    vars: { "piece-border-width": 2 },
    colors: {
      primary: "#a87419",
      secondary: "#4d4d4d",
      board1: "#858585cc",
      board2: "#686868",
      board3: "#686868",
      player1: "#d1d1d1",
      player1road: "#d1d1d1",
      player1flat: "#c7c7c7",
      player1special: "#bcbcbc",
      player1border: "#424242",
      player2: "#212121",
      player2road: "#424242",
      player2flat: "#424242",
      player2special: "#373737",
      player2border: "#c7c7c7",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: true,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "stealth",
    isBuiltIn: true,
    boardStyle: "blank",
    boardChecker: true,
    rings: 4,
    vars: {
      "piece-border-width": 1,
      "rings-opacity": 0.25,
    },
    colors: {
      primary: "#800000",
      secondary: "#111111",
      board1: "#585858",
      board2: "#515151",
      board3: "#303030",
      player1: "#ababab",
      player1road: "#ababab",
      player1flat: "#a2a2a2",
      player1special: "#b3b3b3",
      player1border: "#262626",
      player2: "#000000",
      player2road: "#262626",
      player2flat: "#363636",
      player2special: "#1a1a1a",
      player2border: "#000000",
      ring1: "#ffffff44",
      ring2: "#ffffff88",
      ring3: "#ffffffcc",
      ring4: "#ffffffff",
      textLight: "#fafafa99",
      textDark: "#212121cd",
      umbra: "#00000066",
    },
    primaryDark: true,
    secondaryDark: true,
    board1Dark: true,
    board2Dark: true,
    player1Dark: false,
    player2Dark: true,
  },
  {
    id: "terra",
    isBuiltIn: true,
    boardStyle: "grid3",
    boardChecker: true,
    rings: 4,
    vars: {
      "piece-border-width": 1,
      "rings-opacity": 0.2,
    },
    colors: {
      primary: "#edcc55",
      secondary: "#50628c",
      board1: "#95ad66",
      board2: "#88a356",
      board3: "#877863",
      player1: "#ddf0dd",
      player1road: "#ddf0dd",
      player1flat: "#d2e4d2",
      player1special: "#e1f2e1",
      player1border: "#545e54",
      player2: "#364136",
      player2road: "#545e54",
      player2flat: "#545e54",
      player2special: "#363d36",
      player2border: "#101210",
      ring1: "#00000099",
      ring2: "#00000033",
      ring3: "#ffffffaa",
      ring4: "#ffffffff",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000033",
    },
    primaryDark: false,
    secondaryDark: true,
    player1Dark: false,
    player2Dark: true,
    board1Dark: true,
    board2Dark: true,
  },
  {
    id: "zen",
    isBuiltIn: true,
    boardStyle: "grid3",
    boardChecker: false,
    vars: { "piece-border-width": 1 },
    colors: {
      primary: "#6ca130",
      secondary: "#dddddd",
      board1: "#decb9e",
      board2: "#d1bc8a",
      board3: "#d1bc8a",
      player1: "#ffffff",
      player1road: "#ffffff",
      player1flat: "#f2f2f2",
      player1special: "#ffffff",
      player1border: "#c7c7c7",
      player2: "#444444",
      player2road: "#606060",
      player2flat: "#606060",
      player2special: "#454444",
      player2border: "#171717",
      textLight: "#fafafacd",
      textDark: "#212121cd",
      umbra: "#00000055",
    },
    primaryDark: true,
    secondaryDark: false,
    player1Dark: false,
    player2Dark: true,
    board1Dark: false,
    board2Dark: false,
  },
];
