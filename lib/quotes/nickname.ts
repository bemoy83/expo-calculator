export function normalizeNickname(nickname: string | undefined): string | undefined {
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : undefined;
}

export function formatInstanceName(moduleName: string, nickname: string | undefined): string {
  const normalized = normalizeNickname(nickname);
  return normalized ? `${moduleName} · ${normalized}` : moduleName;
}
