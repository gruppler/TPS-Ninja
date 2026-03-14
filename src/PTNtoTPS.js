const { Board } = require("./Board");
const { Ply } = require("./Ply");
const { sanitizeOptions } = require("./options");

function PTNtoTPS(args) {
  const options = { tps: args[0] || "" };
  const plies = [];
  args.slice(1).forEach((arg) => {
    let [key, value] = arg.split("=");
    if (value) {
      options[key] = value;
    } else {
      try {
        let ply = new Ply(key);
        if (ply) {
          plies.push(ply);
        }
      } catch (error) {}
    }
  });
  if (!plies.length) {
    throw new Error("No valid PTN provided");
  }
  const board = new Board(sanitizeOptions(options));
  plies.forEach((ply) => board.doPly(ply));
  return board.getTPS();
}

exports.PTNtoTPS = PTNtoTPS;
