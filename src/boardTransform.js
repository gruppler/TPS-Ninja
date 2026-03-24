export function normalizeBoardTransform(transform = [0, 0]) {
  const rotate = ((transform[0] || 0) % 4 + 4) % 4;
  const flip = ((transform[1] || 0) % 2 + 2) % 2;
  return [rotate, flip];
}

export function transformBoardXY(x, y, size, transform = [0, 0]) {
  const [rotate, flip] = normalizeBoardTransform(transform);

  if (rotate === 1) {
    [x, y] = [y, size - 1 - x];
  } else if (rotate === 2) {
    x = size - 1 - x;
    y = size - 1 - y;
  } else if (rotate === 3) {
    [x, y] = [size - 1 - y, x];
  }

  if (flip) {
    x = size - 1 - x;
  }

  return { x, y };
}

export function transformDirection(direction, transform = [0, 0]) {
  if (!direction) return direction;

  const [rotate, flip] = normalizeBoardTransform(transform);
  let result = direction;

  if (rotate === 1) {
    result = { "+": ">", "-": "<", ">": "-", "<": "+" }[result];
  } else if (rotate === 2) {
    result = { "+": "-", "-": "+", ">": "<", "<": ">" }[result];
  } else if (rotate === 3) {
    result = { "+": "<", "-": ">", ">": "+", "<": "-" }[result];
  }

  if (flip) {
    result = { ">": "<", "<": ">" }[result] || result;
  }

  return result;
}
