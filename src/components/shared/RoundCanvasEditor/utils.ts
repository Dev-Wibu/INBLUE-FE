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
    { x: fromPos.x + CARD_W, y: fromPos.y + CARD_H / 2, type: "right" },
    { x: fromPos.x + CARD_W / 2, y: fromPos.y + CARD_H, type: "bottom" },
    { x: fromPos.x, y: fromPos.y + CARD_H / 2, type: "left" },
    { x: fromPos.x + CARD_W / 2, y: fromPos.y, type: "top" },
  ];

  const toPorts = [
    { x: toPos.x, y: toPos.y + CARD_H / 2, type: "left" },
    { x: toPos.x + CARD_W / 2, y: toPos.y, type: "top" },
    { x: toPos.x + CARD_W, y: toPos.y + CARD_H / 2, type: "right" },
    { x: toPos.x + CARD_W / 2, y: toPos.y + CARD_H, type: "bottom" },
  ];

  // Case 1: Same row, flowing Rightward (toPos.x > fromPos.x)
  if (Math.abs(fromPos.y - toPos.y) < 30 && toPos.x > fromPos.x) {
    const f = fromPorts[0]; // Right
    const t = toPorts[0]; // Left
    const midX = (f.x + t.x) / 2;
    return {
      path: `M ${f.x} ${f.y} L ${t.x} ${t.y}`,
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: midX,
      cp1y: f.y,
      cp2x: midX,
      cp2y: t.y,
    };
  }

  // Case 2: Same row, flowing Leftward (toPos.x < fromPos.x - Snake flow)
  if (Math.abs(fromPos.y - toPos.y) < 30 && toPos.x < fromPos.x) {
    const f = fromPorts[2]; // Left
    const t = toPorts[2]; // Right
    const midX = (f.x + t.x) / 2;
    return {
      path: `M ${f.x} ${f.y} L ${t.x} ${t.y}`,
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: midX,
      cp1y: f.y,
      cp2x: midX,
      cp2y: t.y,
    };
  }

  // Case 3: Vertical transition down to next row (Right-angle Orthogonal turn down)
  if (toPos.y > fromPos.y + 30) {
    // Directly aligned vertically on Snake turn
    if (Math.abs(fromPos.x - toPos.x) < 50) {
      const f = fromPorts[1]; // Bottom
      const t = toPorts[1]; // Top
      return {
        path: `M ${f.x} ${f.y} L ${t.x} ${t.y}`,
        x1: f.x,
        y1: f.y,
        x2: t.x,
        y2: t.y,
        cp1x: f.x,
        cp1y: (f.y + t.y) / 2,
        cp2x: t.x,
        cp2y: (f.y + t.y) / 2,
      };
    }

    const f = fromPorts[1]; // Bottom
    const t = toPorts[1]; // Top
    const midY = (f.y + t.y) / 2;
    return {
      path: `M ${f.x} ${f.y} V ${midY} H ${t.x} V ${t.y}`,
      x1: f.x,
      y1: f.y,
      x2: t.x,
      y2: t.y,
      cp1x: f.x,
      cp1y: midY,
      cp2x: t.x,
      cp2y: midY,
    };
  }

  // Fallback
  const f = fromPorts[0];
  const t = toPorts[0];
  return {
    path: `M ${f.x} ${f.y} L ${t.x} ${t.y}`,
    x1: f.x,
    y1: f.y,
    x2: t.x,
    y2: t.y,
    cp1x: f.x,
    cp1y: f.y,
    cp2x: t.x,
    cp2y: t.y,
  };
};
