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

  let evaluationsByFrame = null;
  if (isString(options.evaluationsByFrame)) {
    try {
      evaluationsByFrame = JSON.parse(options.evaluationsByFrame);
    } catch (error) {
      evaluationsByFrame = null;
    }
  } else if (isArray(options.evaluationsByFrame)) {
    evaluationsByFrame = options.evaluationsByFrame;
  }
  delete options.evaluationsByFrame;

  const delayAnalysis = options.delayAnalysis && suggestionsByFrame;

  function hasSuggestions(s) {
    return isArray(s) && s.length > 0;
  }

  function normalizeEvaluation(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const evaluation = Number(value);
    return isNaN(evaluation)
      ? null
      : Math.max(-100, Math.min(100, evaluation));
  }

  // Set initial suggestions
  const initialSuggestions = suggestionsByFrame
    ? suggestionsByFrame[0] || null
    : null;
  if (delayAnalysis && hasSuggestions(initialSuggestions)) {
    options.suggestions = null;
  } else {
    options.suggestions = initialSuggestions;
  }
  const initialEvaluation = evaluationsByFrame
    ? normalizeEvaluation(evaluationsByFrame[0])
    : options.evaluation;
  options.evaluation = initialEvaluation;

  const plies = options.plies || [];
  if (plies.length) {
    delete options.plies;
    delete options.ply;
    delete options.hl;
  }

  // Calculate total frames (extra frame inserted per position with suggestions)
  let totalFrames = plies.length + 1;
  if (delayAnalysis) {
    for (let i = 0; i <= plies.length; i++) {
      if (hasSuggestions(suggestionsByFrame[i])) totalFrames++;
    }
  }

  let canvas = TPStoCanvas(options);
  let tps = canvas.tps;
  const encoder = new GIFEncoder(
    canvas.width,
    canvas.height,
    "neuquant",
    false,
    totalFrames
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

  // If initial position has suggestions, add the analysis frame
  if (delayAnalysis && hasSuggestions(initialSuggestions)) {
    options.tps = tps;
    delete options.ply;
    options.suggestions = initialSuggestions;
    options.evaluation = initialEvaluation;
    canvas = TPStoCanvas(options);
    encoder.setDelay(options.delay);
    encoder.addFrame(canvas.ctx);
  }

  let frameIndex = 1;
  while (plies.length) {
    const plyText = plies.shift();
    options.tps = tps;
    options.ply = plyText;
    const isLastPly = !plies.length;
    const frameSuggestions = suggestionsByFrame
      ? suggestionsByFrame[frameIndex] || null
      : null;
    const frameEvaluation = evaluationsByFrame
      ? normalizeEvaluation(evaluationsByFrame[frameIndex])
      : options.evaluation;
    options.evaluation = frameEvaluation;

    if (delayAnalysis && hasSuggestions(frameSuggestions)) {
      // Render ply frame without suggestions
      options.suggestions = null;
      canvas = TPStoCanvas(options);
      tps = canvas.tps;
      encoder.setDelay(options.delay);
      encoder.addFrame(canvas.ctx);

      // Render same position with suggestions (hl preserves highlight)
      options.tps = tps;
      options.hl = plyText;
      delete options.ply;
      options.suggestions = frameSuggestions;
      options.evaluation = frameEvaluation;
      canvas = TPStoCanvas(options);
      delete options.hl;
      encoder.setDelay(options.delay + options.delay * isLastPly);
      encoder.addFrame(canvas.ctx);
    } else {
      options.suggestions = frameSuggestions;
      canvas = TPStoCanvas(options);
      tps = canvas.tps;
      encoder.setDelay(options.delay + options.delay * isLastPly);
      encoder.addFrame(canvas.ctx);
    }

    frameIndex++;
  }
  encoder.finish();
  return stream;
};
