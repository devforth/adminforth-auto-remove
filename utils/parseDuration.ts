const UNITS: Record<string, number> = {
  s: 1000,
  min: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  mon: 2_592_000_000,
  y: 31_536_000_000,
};

export function parseDuration(value: string): number {
  const match = value.match(/^(\d+)\s*(s|min|h|d|w|mon|y)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }

  const [, amount, unit] = match;
  return Number(amount) * UNITS[unit];
}
