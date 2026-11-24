import { HttpResponse } from 'shared/types/http';
import i18n from 'src/i18n';
import { getResponseFormatWarning } from 'src/utils/http';

/**
 * The warnings of a run, most basic first (the UI shows the first one): how the response declares its body, then the
 * given ones, e.g. a dynamic variable that couldn't be extracted (often because of the body).
 */
export function getResponseWarnings(
  response: HttpResponse | null | undefined,
  ...otherWarnings: (string | null | undefined)[]
): string[] {
  const formatWarning = getResponseFormatWarning(response);

  return [formatWarning && i18n.t(`response.${formatWarning}`), ...otherWarnings].filter(
    (warning): warning is string => Boolean(warning),
  );
}
