const { isString } = require("lodash");
const { isDark } = require("./colors");
const { themes } = require("./themes");

function computeThemeBooleans(theme) {
  var c = theme.colors;
  if (c.player1flat) theme.player1FlatDark = isDark(c.player1flat);
  if (c.player1special) theme.player1SpecialDark = isDark(c.player1special);
  if (c.player2flat) theme.player2FlatDark = isDark(c.player2flat);
  if (c.player2special) theme.player2SpecialDark = isDark(c.player2special);
  if (c.board1) theme.board1Dark = isDark(c.board1);
  if (c.board2) theme.board2Dark = isDark(c.board2);
  return theme;
}

function parseTheme(theme) {
  if (!theme || !isString(theme)) {
    return computeThemeBooleans(theme || themes[0]);
  }
  if (theme[0] === "{") {
    // Custom theme
    try {
      let parsedTheme = JSON.parse(theme);
      if (!parsedTheme.colors) {
        throw new Error("Missing theme colors");
      }
      let colors = Object.keys(parsedTheme.colors);
      if (
        Object.keys(themes[0].colors).some((color) => !colors.includes(color))
      ) {
        throw new Error("Missing theme colors");
      }
      if (theme.rings > 0) {
        if (theme.rings > 4) {
          throw new Error("Rings must not exceed 4");
        }
        for (let ring = 1; ring <= theme.rings; ring++) {
          if (!theme.colors[`ring${ring}`]) {
            throw new Error(
              `Expected ${theme.rings} ring(s) but found ${ring - 1}`
            );
          }
        }
      }
      return computeThemeBooleans(parsedTheme);
    } catch (err) {
      console.log(err);
      throw new Error("Invalid theme");
    }
  } else {
    // Built-in theme
    theme = themes.find((builtIn) => builtIn.id === theme);
    if (!theme) {
      throw new Error("Invalid theme ID");
    }
    return computeThemeBooleans(theme);
  }
}

exports.parseTheme = parseTheme;
