import crypto from 'crypto';
import { IntegrityStatus, ProjectData } from '../types/project';

// Part of the checksum format stored in project files: changing it marks every saved project as modified
const CHECKSUM_PREFIX = 'sha256:';

/** SHA-256 of the canonicalized data, prefixed with "sha256:". */
export function computeChecksum(data: ProjectData): string {
  const hash = crypto.createHash('sha256').update(canonicalize(data), 'utf-8').digest('hex');

  return `${CHECKSUM_PREFIX}${hash}`;
}

/** Compares a project's stored checksum with its data: `missing` when none is stored, `modified` when they differ. */
export function verifyChecksum(checksum: string | undefined, data: ProjectData): IntegrityStatus {
  if (!checksum) return 'missing';

  return computeChecksum(data) === checksum ? 'verified' : 'modified';
}

/**
 * Deterministic JSON: object keys are sorted alphabetically, so key order doesn't change the checksum.
 * Arrays keep their order.
 */
function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue: unknown) => {
    if (!nestedValue || typeof nestedValue !== 'object' || Array.isArray(nestedValue)) return nestedValue;

    const record = nestedValue as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, record[key]]),
    );
  });
}
