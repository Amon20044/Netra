function randomId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMessageId(): string {
  return `msg_${randomId()}`;
}

export function createArtifactId(): string {
  return `art_${randomId()}`;
}
