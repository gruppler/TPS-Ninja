import fs from "fs";
import { isArray, isFunction } from "lodash-es";
import { sanitizeOptions } from "./options.js";
import { TPStoCanvas } from "./TPStoCanvas.js";

export const TPStoPNG = function (args, streamTo = null) {
  let options;
  if (isArray(args)) {
    options = { tps: args[0] || "" };
    args.slice(1).forEach((arg) => {
      const [key, value] = arg.split("=");
      options[key] = value;
    });
  } else {
    options = args;
  }
  sanitizeOptions(options);

  const canvas = TPStoCanvas(options);

  if (isFunction(canvas.pngStream)) {
    const stream = canvas.pngStream();
    if (streamTo) {
      stream.pipe(streamTo);
    } else if (isFunction(fs.createWriteStream)) {
      let name = options.name || "takboard.png";
      if (!name.endsWith(".png")) {
        name += ".png";
      }
      const out = fs.createWriteStream("./" + name);
      stream.on("data", (chunk) => out.write(chunk));
    }
  }
  return canvas;
};
