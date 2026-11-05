import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { getTestsStatistics } from 'src/test-engine';

const testResultMetrics: string[][] = [
  ['bugs', 'common.bugs', 'text-metric-bug'],
  ['failed', 'common.failed', 'text-metric-fail'],
  ['warnings', 'common.warnings', 'text-metric-warning'],
  ['passed', 'common.passed', 'text-metric-pass'],
];

export default function TestResultsSummary({
  statistics,
  onClick,
}: {
  statistics: ReturnType<typeof getTestsStatistics>[];
  onClick?: (index: number) => void;
}) {
  const { t } = useTranslation();

  const totals = useMemo(
    () =>
      statistics.reduce(
        (acc, { bugs, failed, ignored, info, manual, passed, warnings }) => ({
          bugs: acc.bugs + bugs,
          failed: acc.failed + failed,
          ignored: acc.ignored + ignored,
          info: acc.info + info,
          manual: acc.manual + manual,
          passed: acc.passed + passed,
          warnings: acc.warnings + warnings,
        }),
        { bugs: 0, failed: 0, ignored: 0, info: 0, manual: 0, passed: 0, warnings: 0 },
      ),
    [statistics],
  );
  const findings = useMemo(
    () =>
      statistics
        .map((stats, index) => ({ ...stats, index }))
        .filter(({ bugs, failed, warnings }) => bugs + failed + warnings > 0)
        .sort((a, b) => b.bugs - a.bugs || b.failed - a.failed || b.warnings - a.warnings),
    [statistics],
  );

  return (
    <div className="flex flex-col gap-4 py-3 px-4">
      <div className="results-heading-row">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h5 className="m-0">Test Results</h5>
            <p className="m-0 text-xs text-muted-foreground">
              Review bugs and failed checks first. Expand a test for request and response details.
            </p>
          </div>
          {findings.length > 0 && (
            <Button buttonType={ButtonType.SECONDARY} className="shrink-0" onClick={() => onClick?.(findings[0].index)}>
              Review Findings
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 @xl:grid-cols-4 gap-2">
        {testResultMetrics.map(([key, label, color]) => (
          <div key={key} className="flex flex-col gap-2 py-3 px-4 border border-border rounded">
            <span className={cn('text-2xl font-semibold', color)}>{totals[key as keyof typeof totals]}</span>
            <span className="text-xs text-muted-foreground">{t(label)}</span>
          </div>
        ))}
      </div>
      {(totals.manual > 0 || totals.info > 0 || totals.ignored > 0) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {totals.manual > 0 && (
            <span>
              {t('common.manual')}: <strong>{totals.manual}</strong>
            </span>
          )}
          {totals.info > 0 && (
            <span>
              {t('common.info')}: <strong>{totals.info}</strong>
            </span>
          )}
          {totals.ignored > 0 && (
            <span>
              {t('common.ignored')}: <strong>{totals.ignored}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
