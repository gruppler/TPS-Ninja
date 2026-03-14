import { isArray } from "lodash-es";
import { Board } from "./Board.js";
import { Ply } from "./Ply.js";
import { sanitizeOptions } from "./options.js";

export const PTNtoTPS = function (args) {
  let options;
  let plies;
  if (isArray(args)) {
    plies = [];
    options = { tps: args[0] || "" };
    args.slice(1).forEach((arg) => {
      const [key, value] = arg.split("=");
      if (value) {
        options[key] = value;
      } else {
        try {
          const ply = new Ply(key);
          if (ply) {
            plies.push(ply);
          }
        } catch (error) {}
      }
    });
  } else {
    options = args;
    plies = options.plies;
  }
  sanitizeOptions(options);
  if (!plies.length) {
    throw new Error("No valid PTN provided");
  }
  const board = new Board(options);
  plies.forEach((ply) => board.doPly(ply));
  return board.getTPS();
};
