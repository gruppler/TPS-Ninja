export function hexToRgb(hex) {
  if (typeof hex !== "string") {
    throw new TypeError("Expected a string");
  }

  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  } else if (hex.length === 4) {
    hex =
      hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  const num = parseInt(hex, 16);

  return hex.length > 6
    ? {
        r: (num >> 24) & 255,
        g: (num >> 16) & 255,
        b: (num >> 8) & 255,
        a: Math.round((num & 255) / 2.55),
      }
    : { r: num >> 16, g: (num >> 8) & 255, b: num & 255 };
}

export function luminosity(color) {
  const rgb = typeof color === "string" ? hexToRgb(color) : color;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function isDark(color) {
  return luminosity(color) <= 0.4;
}

export function parseHexRgba(hex) {
  if (typeof hex !== "string") return hex;
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  } else if (hex.length === 4) {
    hex =
      hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const num = parseInt(hex, 16);
  if (hex.length > 6) {
    return {
      r: (num >> 24) & 255,
      g: (num >> 16) & 255,
      b: (num >> 8) & 255,
      a: (num & 255) / 255,
    };
  }
  return { r: num >> 16, g: (num >> 8) & 255, b: num & 255, a: 1 };
}

export function compositeColors(bgHex, fgHex, fgOpacity) {
  const bg = parseHexRgba(bgHex);
  const fg = parseHexRgba(fgHex);
  const a = fg.a * (fgOpacity !== undefined ? fgOpacity : 1);
  const r = Math.round(fg.r * a + bg.r * (1 - a));
  const g = Math.round(fg.g * a + bg.g * (1 - a));
  const b = Math.round(fg.b * a + bg.b * (1 - a));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
