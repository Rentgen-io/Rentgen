interface UpdateCheckBase {
  currentVersion: string;
  checkedAt: number;
}

export type UpdateCheckResult =
  | (UpdateCheckBase & { status: 'upToDate' | 'updateAvailable'; latestVersion: string })
  | (UpdateCheckBase & { status: 'error' });
