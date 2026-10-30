export function truncateHash(hash: string, len: number = 16): string {
  return hash ? hash.slice(0, len) + "..." : "";
}
