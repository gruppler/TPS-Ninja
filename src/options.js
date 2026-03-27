import {
  isArray,
  isBoolean,
  isNumber,
  isString,
} from "lodash-es";

export const defaults = {
  delay: 1000,
  imageSize: "md",
  textSize: "md",
  axisLabels: true,
  axisLabelsSmall: false,
  turnIndicator: true,
  flatCounts: true,
  stackCounts: true,
  komi: 0,
  moveNumber: true,
  evalText: true,
  opening: "swap",
  ply: "",
  tps: "",
  plies: [],
  showRoads: true,
  unplayedPieces: true,
  padding: true,
  bgAlpha: 1,
  transparent: false,
  hlSquares: true,
  highlighter: null,
  transform: [0, 0],
  plyIsDone: true,
  font: "sans",
  suggestions: null,
  boardEvalBar: false,
  evaluation: null,
  wdl: null,
  wins1: null,
  draws: null,
  wins2: null,
  delayAnalysis: false,
};

export function sanitizeOptions(options) {
  if (
    options.delayAnalysisByFrame !== undefined &&
    options.delayAnalysis === undefined
  ) {
    options.delayAnalysis = options.delayAnalysisByFrame;
  }

  for (const key in defaults) {
    if (options.hasOwnProperty(key)) {
      if (key === "highlighter" && isString(options[key])) {
        try {
          options[key] = JSON.parse(options[key]);
        } catch (err) {
          console.log(err);
          throw new Error("Invalid highlighter");
        }
      } else if (key === "moveNumber" && !isBoolean(options[key])) {
        const number = parseInt(options[key], 10);
        if (isNaN(number)) {
          options[key] = options[key] !== "false";
        } else {
          options[key] = number;
        }
      } else if (key === "transform") {
        if (isString(options[key])) {
          try {
            options[key] = eval(options[key]);
          } catch (error) {
            options[key] = defaults[key];
          }
        }
        if (isArray(options[key])) {
          options[key] = options[key].slice(0, 2).map((n) => parseInt(n, 10));
          if (options[key].some((n) => isNaN(n))) {
            options[key] = defaults[key];
          }
        } else {
          options[key] = defaults[key];
        }
      } else if (key === "suggestions") {
        if (isString(options[key])) {
          try {
            options[key] = JSON.parse(options[key]);
          } catch (err) {
            options[key] = null;
          }
        }
      } else if (key === "wdl") {
        if (isString(options[key])) {
          try {
            options[key] = JSON.parse(options[key]);
          } catch (err) {
            options[key] = null;
          }
        }
      } else if (key === "evaluation") {
        if (
          options[key] === null ||
          options[key] === undefined ||
          options[key] === ""
        ) {
          options[key] = null;
        } else {
          const evaluation = Number(options[key]);
          options[key] = isNaN(evaluation)
            ? null
            : Math.max(-100, Math.min(100, evaluation));
        }
      } else if (["wins1", "draws", "wins2"].includes(key)) {
        if (
          options[key] === null ||
          options[key] === undefined ||
          options[key] === ""
        ) {
          options[key] = null;
        } else {
          const value = Number(options[key]);
          options[key] = isNaN(value) ? null : Math.max(0, value);
        }
      } else if (key === "plies") {
        if (isString(options[key])) {
          options[key] = options[key].split(/[\s,]+/);
        }
      } else if (isBoolean(defaults[key])) {
        options[key] = options[key] !== false && options[key] !== "false";
      } else if (isNumber(defaults[key])) {
        options[key] = Number(options[key]);
      }
    } else {
      options[key] = defaults[key];
    }
  }
  if (options.size) {
    options.size = Number(options.size);
  }
  if (isString(options.tps) && options.tps && options.tps.length === 1) {
    options.tps = Number(options.tps);
  }
  return options;
}
