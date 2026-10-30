export function formatConfidence(conf: number): string {
  return `${(conf * 100).toFixed(0)}%`;
}
