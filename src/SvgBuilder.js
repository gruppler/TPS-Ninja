import { createCanvas } from "canvas";

export class SvgBuilder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.defs = [];
    this.elements = [];
    this._defIds = new Set();
    // Hidden canvas for text measurement
    this._measureCanvas = createCanvas(1, 1);
    this._measureCtx = this._measureCanvas.getContext("2d");
  }

  // --- Text measurement (delegates to node-canvas) ---
  setFont(font) {
    this._measureCtx.font = font;
  }

  measureText(text) {
    return this._measureCtx.measureText(text);
  }

  // --- Defs (filters, clipPaths, etc.) ---
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

  // --- Helpers to escape text ---
  static esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --- Shape primitives ---
  rect(x, y, w, h, { fill, opacity, rx, ry } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}"`;
    if (rx) s += ` rx="${rx}"`;
    if (ry) s += ` ry="${ry || rx}"`;
    if (fill) s += ` fill="${fill}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  circle(cx, cy, r, { fill, stroke, strokeWidth, opacity } = {}) {
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}"`;
    if (fill) s += ` fill="${fill}"`;
    if (stroke) s += ` stroke="${stroke}"`;
    if (strokeWidth) s += ` stroke-width="${strokeWidth}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  path(d, { fill, stroke, strokeWidth, lineCap, opacity } = {}) {
    let s = `<path d="${d}"`;
    if (fill) s += ` fill="${fill}"`;
    else s += ` fill="none"`;
    if (stroke) s += ` stroke="${stroke}"`;
    if (strokeWidth) s += ` stroke-width="${strokeWidth}"`;
    if (lineCap) s += ` stroke-linecap="${lineCap}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  line(x1, y1, x2, y2, { stroke, strokeWidth, lineCap, opacity } = {}) {
    let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`;
    if (stroke) s += ` stroke="${stroke}"`;
    if (strokeWidth) s += ` stroke-width="${strokeWidth}"`;
    if (lineCap) s += ` stroke-linecap="${lineCap}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  polygon(points, { fill, stroke, strokeWidth, opacity } = {}) {
    const pts = points.map((p) => `${p[0]},${p[1]}`).join(" ");
    let s = `<polygon points="${pts}"`;
    if (fill) s += ` fill="${fill}"`;
    if (stroke) s += ` stroke="${stroke}"`;
    if (strokeWidth) s += ` stroke-width="${strokeWidth}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    s += `/>`;
    this.elements.push(s);
  }

  text(x, y, content, { fill, font, fontSize, fontWeight, fontFamily, textAnchor, dy, opacity, filter } = {}) {
    let s = `<text x="${x}" y="${y}"`;
    if (fill) s += ` fill="${fill}"`;
    if (font) s += ` font="${font}"`;
    if (fontSize) s += ` font-size="${fontSize}"`;
    if (fontWeight) s += ` font-weight="${fontWeight}"`;
    if (fontFamily) s += ` font-family="${fontFamily}"`;
    if (textAnchor) s += ` text-anchor="${textAnchor}"`;
    if (dy) s += ` dy="${dy}"`;
    if (opacity != null && opacity !== 1) s += ` opacity="${opacity}"`;
    if (filter) s += ` filter="url(#${filter})"`;
    s += `>${SvgBuilder.esc(content)}</text>`;
    this.elements.push(s);
  }

  // --- Grouping ---
  openGroup(attrs = {}) {
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

  // --- Rounded rect as SVG path ---
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

  roundRect(x, y, w, h, radius, { fill, stroke, strokeWidth, opacity } = {}) {
    this.path(this.roundRectPath(x, y, w, h, radius), { fill, stroke, strokeWidth, opacity });
  }

  // --- Serialize ---
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
