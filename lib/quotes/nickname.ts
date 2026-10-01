export function normalizeNickname(nickname: string | undefined): string | undefined {
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : undefined;
}

// For aria-labels: screen readers pause on a comma but may read "·" aloud.
export function formatInstanceLabel(moduleName: string, nickname: string | undefined): string {
  const normalized = normalizeNickname(nickname);
  return normalized ? `${moduleName}, ${normalized}` : moduleName;
}
