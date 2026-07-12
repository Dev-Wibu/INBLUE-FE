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

export const getBestConnection = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
  const CARD_W = 208;
  const CARD_H = 130;

  const fromPorts = [
    { x: fromPos.x + CARD_W, y: fromPos.y + CARD_H / 2, nx: 1, ny: 0 }, // Right
    { x: fromPos.x, y: fromPos.y + CARD_H / 2, nx: -1, ny: 0 }, // Left
    { x: fromPos.x + CARD_W / 2, y: fromPos.y + CARD_H, nx: 0, ny: 1 }, // Bottom
    { x: fromPos.x + CARD_W / 2, y: fromPos.y, nx: 0, ny: -1 }, // Top
  ];

  const toPorts = [
    { x: toPos.x + CARD_W, y: toPos.y + CARD_H / 2, nx: 1, ny: 0 }, // Right
    { x: toPos.x, y: toPos.y + CARD_H / 2, nx: -1, ny: 0 }, // Left
    { x: toPos.x + CARD_W / 2, y: toPos.y + CARD_H, nx: 0, ny: 1 }, // Bottom
    { x: toPos.x + CARD_W / 2, y: toPos.y, nx: 0, ny: -1 }, // Top
  ];

  let bestDist = Infinity;
  let bestFrom = fromPorts[0];
  let bestTo = toPorts[1];

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

  // Calculate control points based on distance
  const cpDist = Math.min(Math.max(bestDist * 0.35, 45), 160);
  const cp1x = bestFrom.x + bestFrom.nx * cpDist;
  const cp1y = bestFrom.y + bestFrom.ny * cpDist;
  const cp2x = bestTo.x + bestTo.nx * cpDist;
  const cp2y = bestTo.y + bestTo.ny * cpDist;

  return {
    x1: bestFrom.x,
    y1: bestFrom.y,
    x2: bestTo.x,
    y2: bestTo.y,
    cp1x,
    cp1y,
    cp2x,
    cp2y,
  };
};
