import { isString } from "lodash-es";
import themes, { computeThemeBooleans } from "./themes.js";

export const parseTheme = function (theme) {
  if (!theme || !isString(theme)) {
    return computeThemeBooleans(theme || themes[0]);
  }
  if (theme[0] === "{") {
    // Custom theme
    try {
      const parsedTheme = JSON.parse(theme);
      if (!parsedTheme.colors) {
        throw new Error("Missing theme colors");
      }
      const colors = Object.keys(parsedTheme.colors);
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
};
