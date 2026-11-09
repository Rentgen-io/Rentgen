import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { getTestsStatistics } from 'src/test-engine';

import InfoIcon from 'src/assets/icons/info-icon.svg';

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
  statistics: { [label: string]: ReturnType<typeof getTestsStatistics> };
  onClick: (index: number) => void;
}) {
  const { t } = useTranslation();

  const totals = useMemo(
    () =>
      Object.values(statistics).reduce(
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
      Object.entries(statistics)
        .map(([label, stats], index) => ({ ...stats, label, index }))
        .filter(({ bugs, failed, warnings }) => bugs + failed + warnings > 0)
        .sort((a, b) => b.bugs - a.bugs || b.failed - a.failed || b.warnings - a.warnings),
    [statistics],
  );

  return (
    <div className="flex flex-col gap-4 py-3 px-4">
      <div className="results-heading-row">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h5 className="m-0">{t('tests.resultsTitle')}</h5>
            <p className="m-0 text-xs text-muted-foreground">{t('tests.resultsDescription')}</p>
          </div>
          {findings.length > 0 && (
            <Button buttonType={ButtonType.SECONDARY} className="shrink-0" onClick={() => onClick(findings[0].index)}>
              {t('tests.reviewFindings')}
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 @xl:grid-cols-4 gap-2">
        {testResultMetrics.map(([key, label, color]) => (
          <div key={key} className="flex flex-col gap-2 py-3 px-4 border border-border rounded">
            <span className={cn('text-2xl font-semibold', color)}>{totals[key as keyof typeof totals]}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {t(label)}{' '}
              <InfoIcon
                className="size-4 shrink-0 opacity-65 rounded-full cursor-help outline-2 outline-transparent hover:opacity-100 hover:bg-surface hover:outline-surface"
                data-tooltip-id={`tooltip-${key}`}
              />
            </span>
            <Tooltip id={`tooltip-${key}`} place="bottom-start">
              <div className="flex flex-col gap-2 max-w-60 text-xs">
                <strong>{t(label)}</strong>
                <p className="m-0">{t(`tests.metric.${key}`)}</p>
              </div>
            </Tooltip>
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
      {findings.length > 0 && (
        <div className="border border-border divide-y divide-border rounded overflow-hidden">
          {findings.map(({ bugs, failed, label, index, warnings }) => (
            <div
              className="flex items-center justify-between gap-2 py-3 px-4 text-xs cursor-pointer hover:bg-accent-soft"
              key={index}
              onClick={() => onClick(index)}
            >
              <span>{label}</span>
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {bugs > 0 && (
                  <span>
                    {t('common.bugs')}: <strong className="text-metric-bug">{bugs}</strong>
                  </span>
                )}
                {failed > 0 && (
                  <span>
                    {t('common.failed')}: <strong className="text-metric-fail">{failed}</strong>
                  </span>
                )}
                {warnings > 0 && (
                  <span className="leading-none">
                    {t('common.warnings')}: <strong className="text-metric-warning">{warnings}</strong>
                  </span>
                )}
                <span>↗</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
