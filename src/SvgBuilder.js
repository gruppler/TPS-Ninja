const { createCanvas } = require("canvas");

class SvgBuilder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.defs = [];
    this.elements = [];
    this._defIds = new Set();
    this._measureCanvas = createCanvas(1, 1);
    this._measureCtx = this._measureCanvas.getContext("2d");
  }

  setFont(font) {
    this._measureCtx.font = font;
  }

  measureText(text) {
    return this._measureCtx.measureText(text);
  }

  addDef(id, content) {
    if (!this._defIds.has(id)) {
      this._defIds.add(id);
      this.defs.push(content);
    }
  }

  shadowFilter(id, offsetX, offsetY, blur, color) {
    this.addDef(
      id,
      `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">` +
        `<feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${blur / 2}" flood-color="${color}" flood-opacity="1"/>` +
        `</filter>`
    );
  }

  static esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  rect(x, y, w, h, opts) {
    opts = opts || {};
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}"`;
    if (opts.fill) s += ` fill="${opts.fill}"`;
    if (opts.rx) s += ` rx="${opts.rx}"`;
    if (opts.ry) s += ` ry="${opts.ry || opts.rx}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  circle(cx, cy, r, opts) {
    opts = opts || {};
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}"`;
    if (opts.fill) s += ` fill="${opts.fill}"`;
    if (opts.stroke) s += ` stroke="${opts.stroke}"`;
    if (opts.strokeWidth) s += ` stroke-width="${opts.strokeWidth}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  path(d, opts) {
    opts = opts || {};
    let s = `<path d="${d}"`;
    if (opts.fill) s += ` fill="${opts.fill}"`;
    else s += ` fill="none"`;
    if (opts.stroke) s += ` stroke="${opts.stroke}"`;
    if (opts.strokeWidth) s += ` stroke-width="${opts.strokeWidth}"`;
    if (opts.lineCap) s += ` stroke-linecap="${opts.lineCap}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  line(x1, y1, x2, y2, opts) {
    opts = opts || {};
    let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`;
    if (opts.stroke) s += ` stroke="${opts.stroke}"`;
    if (opts.strokeWidth) s += ` stroke-width="${opts.strokeWidth}"`;
    if (opts.lineCap) s += ` stroke-linecap="${opts.lineCap}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  polygon(points, opts) {
    opts = opts || {};
    const pts = points.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
    let s = `<polygon points="${pts}"`;
    if (opts.fill) s += ` fill="${opts.fill}"`;
    if (opts.stroke) s += ` stroke="${opts.stroke}"`;
    if (opts.strokeWidth) s += ` stroke-width="${opts.strokeWidth}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  text(x, y, content, opts) {
    opts = opts || {};
    let s = `<text x="${x}" y="${y}"`;
    if (opts.fill) s += ` fill="${opts.fill}"`;
    if (opts.font) s += ` font="${opts.font}"`;
    if (opts.fontSize) s += ` font-size="${opts.fontSize}"`;
    if (opts.fontWeight) s += ` font-weight="${opts.fontWeight}"`;
    if (opts.fontFamily) s += ` font-family="${opts.fontFamily}"`;
    if (opts.textAnchor) s += ` text-anchor="${opts.textAnchor}"`;
    if (opts.dy) s += ` dy="${opts.dy}"`;
    if (opts.opacity != null && opts.opacity !== 1) s += ` opacity="${opts.opacity}"`;
    if (opts.filter) s += ` filter="url(#${opts.filter})"`;
    s += `>${SvgBuilder.esc(content)}</text>`;
    this.elements.push(s);
  }

  openGroup(attrs) {
    attrs = attrs || {};
    let s = "<g";
    if (attrs.transform) s += ` transform="${attrs.transform}"`;
    if (attrs.opacity != null && attrs.opacity !== 1) s += ` opacity="${attrs.opacity}"`;
    if (attrs.filter) s += ` filter="url(#${attrs.filter})"`;
    if (attrs.clipPath) s += ` clip-path="url(#${attrs.clipPath})"`;
    s += ">";
    this.elements.push(s);
  }

  closeGroup() {
    this.elements.push("</g>");
  }

  roundRectPath(x, y, w, h, radius) {
    const r = typeof radius === "object"
      ? { tl: 0, tr: 0, bl: 0, br: 0, ...radius }
      : { tl: radius, tr: radius, bl: radius, br: radius };
    return (
      `M${x + r.tl},${y}` +
      `L${x + w - r.tr},${y}` +
      `Q${x + w},${y} ${x + w},${y + r.tr}` +
      `L${x + w},${y + h - r.br}` +
      `Q${x + w},${y + h} ${x + w - r.br},${y + h}` +
      `L${x + r.bl},${y + h}` +
      `Q${x},${y + h} ${x},${y + h - r.bl}` +
      `L${x},${y + r.tl}` +
      `Q${x},${y} ${x + r.tl},${y}Z`
    );
  }

  roundRect(x, y, w, h, radius, opts) {
    this.path(this.roundRectPath(x, y, w, h, radius), opts);
  }

  toString() {
    const defBlock = this.defs.length
      ? `<defs>${this.defs.join("")}</defs>`
      : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">` +
      defBlock +
      this.elements.join("") +
      "</svg>"
    );
  }
}

exports.SvgBuilder = SvgBuilder;
