import fs from "fs";
import GIFEncoder from "gif-encoder-2";
import { isArray, isFunction, isString } from "lodash-es";
import { sanitizeOptions } from "./options.js";
import { TPStoCanvas } from "./TPStoCanvas.js";

export const TPStoGIF = function (args, streamTo = null) {
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

  let suggestionsByFrame = null;
  if (isString(options.suggestionsByFrame)) {
    try {
      suggestionsByFrame = JSON.parse(options.suggestionsByFrame);
    } catch (error) {
      suggestionsByFrame = null;
    }
  } else if (isArray(options.suggestionsByFrame)) {
    suggestionsByFrame = options.suggestionsByFrame;
  }
  delete options.suggestionsByFrame;
  if (suggestionsByFrame) {
    options.suggestions = suggestionsByFrame[0] || null;
  }

  const plies = options.plies || [];
  if (plies.length) {
    delete options.plies;
    delete options.ply;
    delete options.hl;
  }

  let canvas = TPStoCanvas(options);
  let tps = canvas.tps;
  const encoder = new GIFEncoder(
    canvas.width,
    canvas.height,
    "neuquant",
    false,
    plies.length + 1
  );
  const stream = encoder.createReadStream();
  if (streamTo) {
    stream.pipe(streamTo);
  } else if (isFunction(fs.createWriteStream)) {
    let name = options.name || "takboard.gif";
    if (!name.endsWith(".gif")) {
      name += ".gif";
    }
    const out = fs.createWriteStream("./" + name);
    stream.pipe(out);
  }

  if (isFunction(options.onProgress)) {
    encoder.on("progress", options.onProgress);
  }

  encoder.setRepeat(0);
  if (options.transparent) {
    encoder.setTransparent();
  }
  encoder.setQuality(1);
  encoder.start();
  encoder.setDelay(options.delay);
  encoder.addFrame(canvas.ctx);
  let frameIndex = 1;
  while (plies.length) {
    options.tps = tps;
    options.ply = plies.shift();
    if (suggestionsByFrame) {
      options.suggestions = suggestionsByFrame[frameIndex] || null;
    }
    canvas = TPStoCanvas(options);
    tps = canvas.tps;
    encoder.setDelay(options.delay + options.delay * !plies.length);
    encoder.addFrame(canvas.ctx);
    frameIndex += 1;
  }
  encoder.finish();
  return stream;
};
