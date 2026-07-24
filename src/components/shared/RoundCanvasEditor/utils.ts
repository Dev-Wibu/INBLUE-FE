export const getDistanceToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const projX = x1 + clampedT * dx;
  const projY = y1 + clampedT * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
};

export const getBestConnection = (
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number }
) => {
  const CARD_W = 208;
  const CARD_H = 130;

  // Ports: Right (0), Bottom (1), Left (2), Top (3)
  const fromPorts = [
    { x: fromPos.x + CARD_W, y: fromPos.y + CARD_H / 2, nx: 1, ny: 0 }, // Right
    { x: fromPos.x + CARD_W / 2, y: fromPos.y + CARD_H, nx: 0, ny: 1 }, // Bottom
    { x: fromPos.x, y: fromPos.y + CARD_H / 2, nx: -1, ny: 0 }, // Left
    { x: fromPos.x + CARD_W / 2, y: fromPos.y, nx: 0, ny: -1 }, // Top
  ];

  const toPorts = [
    { x: toPos.x, y: toPos.y + CARD_H / 2, nx: -1, ny: 0 }, // Left
    { x: toPos.x + CARD_W / 2, y: toPos.y, nx: 0, ny: -1 }, // Top
    { x: toPos.x + CARD_W, y: toPos.y + CARD_H / 2, nx: 1, ny: 0 }, // Right
    { x: toPos.x + CARD_W / 2, y: toPos.y + CARD_H, nx: 0, ny: 1 }, // Bottom
  ];

  // Case 1: Same row, flowing Rightward (toPos.x > fromPos.x)
  if (Math.abs(fromPos.y - toPos.y) < 40 && toPos.x > fromPos.x) {
    const f = fromPorts[0]; // Right
    const t = toPorts[0]; // Left
    const dx = Math.max(t.x - f.x, 20);
    const cpDist = Math.min(Math.max(dx * 0.4, 30), 140);
    return {
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: f.x + cpDist,
      cp1y: f.y,
      cp2x: t.x - cpDist,
      cp2y: t.y,
    };
  }

  // Case 2: Same row, flowing Leftward (Snake flow: toPos.x < fromPos.x)
  if (Math.abs(fromPos.y - toPos.y) < 40 && toPos.x < fromPos.x) {
    const f = fromPorts[2]; // Left
    const t = toPorts[2]; // Right
    const dx = Math.max(f.x - t.x, 20);
    const cpDist = Math.min(Math.max(dx * 0.4, 30), 140);
    return {
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: f.x - cpDist,
      cp1y: f.y,
      cp2x: t.x + cpDist,
      cp2y: t.y,
    };
  }

  // Case 3: Transitioning down to lower row (Card Bottom ➔ Card Top)
  if (toPos.y > fromPos.y + 40) {
    const f = fromPorts[1]; // Bottom
    const t = toPorts[1]; // Top
    const dy = Math.max(t.y - f.y, 20);
    const cpDist = Math.min(Math.max(dy * 0.4, 30), 120);
    return {
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: f.x,
      cp1y: f.y + cpDist,
      cp2x: t.x,
      cp2y: t.y - cpDist,
    };
  }

  // Fallback: Smooth Bezier curve between best ports
  let bestDist = Infinity;
  let bestFrom = fromPorts[0];
  let bestTo = toPorts[0];

  for (const f of fromPorts) {
    for (const t of toPorts) {
      const dx = f.x - t.x;
      const dy = f.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestFrom = f;
        bestTo = t;
      }
    }
  }

  const cpDist = Math.min(Math.max(bestDist * 0.35, 30), 120);
  return {
    x1: bestFrom.x,
    y1: bestFrom.y,
    x2: bestTo.x,
    y2: bestTo.y,
    cp1x: bestFrom.x + bestFrom.nx * cpDist,
    cp1y: bestFrom.y + bestFrom.ny * cpDist,
    cp2x: bestTo.x + bestTo.nx * cpDist,
    cp2y: bestTo.y + bestTo.ny * cpDist,
  };
};
