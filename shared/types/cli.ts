export interface CliStatus {
  platform: NodeJS.Platform;
  bundled: { available: boolean; path: string | null };
  pathEntry: { found: boolean; resolvedPath: string | null; pointsToBundled: boolean; version: string | null };
  managedBy: 'package-manager' | 'app' | 'manual' | 'none';
  recommendedTarget: string | null;
  notes: string[];
}

export interface CliActionResult {
  success: boolean;
  message: string;
  details?: string;
}
