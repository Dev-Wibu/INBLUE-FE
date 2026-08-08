declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    x?: number;
    y?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: ("square" | "circle")[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
    resize?: boolean;
  }

  interface CreateTypes {
    (options?: ConfettiOptions): Promise<null>;
    reset(): void;
  }

  const confetti: CreateTypes;
  export default confetti;
}