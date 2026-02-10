export function parseHumanNumber(value: string): number {
  const v = value.toLowerCase().trim();

  if (v.endsWith('kk')) return Number(v.slice(0, -2)) * 1_000_000;
  if (v.endsWith('k')) return Number(v.slice(0, -1)) * 1_000;
  if (v.endsWith('m')) return Number(v.slice(0, -1)) * 1_000_000;

  return Number(v);
}
