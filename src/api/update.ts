import { appConfig } from 'shared/constants';
import { isSuccessStatus } from 'shared/responseStatus';
import { UpdateCheckResult } from 'src/types/update';
import { extractStatusCode } from 'src/utils/http';
import { sendHttp } from './network';
import { getAppVersion } from './system';

const normalizeVersion = (version: string): string => version.trim().replace(/^v/i, '');

export const getUpdateDownloadUrl = (currentVersion: string): string =>
  `${appConfig.origin}/check-for-update.html?current_version=${encodeURIComponent(currentVersion)}`;

/**
 * Compares dotted numeric versions (`3.0.0`, `v1.2.0.9`). Pre-release/build suffixes are ignored —
 * `/releases/latest` never returns drafts or pre-releases anyway.
 * Returns > 0 when `a` is newer, < 0 when `b` is newer, 0 when equal.
 */
export function compareVersions(a: string, b: string): number {
  const toParts = (v: string) =>
    normalizeVersion(v)
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);

  const partsA = toParts(a);
  const partsB = toParts(b);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = await getAppVersion();
  const checkedAt = Date.now();

  try {
    const response = await sendHttp({
      method: 'GET',
      url: appConfig.github.latestReleaseApiUrl,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `Rentgen/${currentVersion}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const tagName = (response.body as { tag_name?: unknown } | null)?.tag_name;
    if (!isSuccessStatus(extractStatusCode(response)) || typeof tagName !== 'string')
      throw new Error(`Unexpected response: ${response.status}`);

    const latestVersion = normalizeVersion(tagName);

    return {
      status: compareVersions(latestVersion, currentVersion) > 0 ? 'updateAvailable' : 'upToDate',
      currentVersion,
      latestVersion,
      checkedAt,
    };
  } catch {
    return { status: 'error', currentVersion, checkedAt };
  }
}
