export function normalizeInstagramHandle(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

export function toDisplayHandle(normalized: string): string {
  if (!normalized) return '';
  return `@${normalized}`;
}

export function isValidInstagramHandle(handle: string): boolean {
  return /^[a-z0-9._]{1,30}$/i.test(handle);
}
