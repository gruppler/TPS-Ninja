const { sanitizeOptions } = require("./options");
const { TPStoCanvas } = require("./TPStoCanvas");

function TPStoPNG(args) {
  const options = { tps: args[0] || "" };
  args.slice(1).forEach((arg) => {
    let [key, value] = arg.split("=");
    options[key] = value;
  });
  const canvas = TPStoCanvas(options);

  let name = options.name || canvas.id.replace(/\//g, "-");
  if (!name.endsWith(".png")) {
    name += ".png";
  }
  const fs = require("fs");
  const out = fs.createWriteStream("./" + name);
  const stream = canvas.pngStream();
  stream.on("data", (chunk) => {
    out.write(chunk);
  });
}

exports.TPStoPNG = TPStoPNG;
