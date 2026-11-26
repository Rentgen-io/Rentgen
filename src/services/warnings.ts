import { ExtractionFailure } from 'shared/types/environment';
import { HttpResponse } from 'shared/types/http';
import i18n from 'src/i18n';
import type { RunWarning } from 'src/store/slices/collectionRunSlice';
import { getResponseFormatWarning } from 'src/utils/http';

/**
 * The warnings of a run, most basic first (the UI shows the first one): how the response declares its body, then the
 * dynamic variables that couldn't be extracted (often because of the body). Kept untranslated (see formatRunWarning).
 */
export function getResponseWarnings(
  response: HttpResponse | null | undefined,
  failures: ExtractionFailure[] = [],
): RunWarning[] {
  const warnings: RunWarning[] = [];
  const formatWarning = getResponseFormatWarning(response);

  if (formatWarning) warnings.push({ type: 'format', warning: formatWarning });
  if (failures.length > 0) warnings.push({ type: 'extraction', failures: failures });

  return warnings;
}

/**
 * The warning's text in the current language. Called while rendering, by components that use `useTranslation()`, so
 * they re-render with the new text when the language changes.
 */
export function formatResponseWarning(warning: RunWarning): string {
  return warning.type === 'format' ? i18n.t(`response.${warning.warning}`) : formatExtractionWarning(warning.failures);
}

/** Warning for the dynamic variables that failed to extract; the reason is shown only for a single failure. */
function formatExtractionWarning(failures: ExtractionFailure[]): string {
  // The names are shown as written in requests, e.g. {{token}} (i18next doesn't interpolate inside values)
  const toToken = (variableName: string) => `{{${variableName}}}`;

  if (failures.length === 1) {
    const [{ reason, selector, variableName }] = failures;

    return i18n.t('response.extraction.failed', {
      reason: i18n.t(`response.extraction.${reason}`, { selector }),
      variable: toToken(variableName),
    });
  }

  return i18n.t('response.extraction.failedMany', {
    variables: failures.map(({ variableName }) => toToken(variableName)).join(', '),
  });
}
