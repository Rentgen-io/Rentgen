// IDs are stored in saved collections, environments and history, so their format must stay `<prefix>_<timestamp>_<random>`

const RANDOM_PART_LENGTH = 7;

export function generateDynamicVariableId(): string {
  return generateId('dvar');
}

export function generateEnvironmentId(): string {
  return generateId('env');
}

export function generateFolderId(): string {
  return generateId('folder');
}

export function generateHistoryId(): string {
  return generateId('hist');
}

export function generateRequestId(): string {
  return generateId('req');
}

/** `<prefix>_<timestamp>_<random base-36 part>`: unique enough for locally created data. */
function generateId(prefix: string): string {
  // Skips the leading "0." of the base-36 fraction
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 2 + RANDOM_PART_LENGTH);

  return `${prefix}_${Date.now()}_${randomPart}`;
}
