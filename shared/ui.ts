export const zoomPercentages = [75, 90, 100, 110, 125, 150, 175, 200] as const;
export function validZoom(value: unknown): value is number { return typeof value === 'number' && zoomPercentages.some(percent => percent === value); }
export function nextZoom(current: number, direction: -1 | 0 | 1): number {
  if (!direction) return 100;
  return direction > 0 ? zoomPercentages.find(value => value > current) ?? 200 : [...zoomPercentages].reverse().find(value => value < current) ?? 75;
}
