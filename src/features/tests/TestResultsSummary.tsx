import { useTranslation } from 'react-i18next';
import { getTestsStatistics } from 'src/test-engine';
import { TestResult } from 'src/types';
import Button, { ButtonType } from 'src/components/buttons/Button';

interface Suite {
  label: string;
  tests?: TestResult[];
  disabledTests?: string[];
}

interface Props {
  suites: Suite[];
  isRunning: boolean;
  onReview(index: number): void;
}

export default function TestResultsSummary({ suites, isRunning, onReview }: Props) {
  const { t } = useTranslation();
  const statistics = suites.map(({ tests, disabledTests }) => getTestsStatistics(tests ?? [], disabledTests));
  const ignored = suites.reduce(
    (sum, { tests, disabledTests }) => sum + (tests ?? []).filter(({ name }) => disabledTests?.includes(name)).length,
    0,
  );
  const totals = statistics.reduce(
    (sum, stats) => ({
      bugs: sum.bugs + stats.bugs,
      failed: sum.failed + stats.failed,
      warnings: sum.warnings + stats.warnings,
      passed: sum.passed + stats.passed,
      manual: sum.manual + stats.manual,
      info: sum.info + stats.info,
    }),
    { bugs: 0, failed: 0, warnings: 0, passed: 0, manual: 0, info: 0 },
  );
  const findings = statistics
    .map((stats, index) => ({ ...stats, index }))
    .filter(({ bugs, failed, warnings }) => bugs + failed + warnings > 0)
    .sort((a, b) => b.bugs - a.bugs || b.failed - a.failed || b.warnings - a.warnings);

  return (
    <section className="results-summary" aria-labelledby="results-heading" aria-busy={isRunning}>
      <div className="results-heading-row">
        <div>
          <h2 id="results-heading">{t('ux.resultsTitle')}</h2>
          <p>{t('ux.resultsHint')}</p>
        </div>
        {findings.length > 0 && (
          <Button buttonType={ButtonType.SECONDARY} onClick={() => onReview(findings[0].index)}>
            {t('ux.reviewFindings')} <span aria-hidden="true">↓</span>
          </Button>
        )}
      </div>
      <dl className="results-metrics">
        {([
          ['bugs', 'common.bugs'],
          ['failed', 'common.failed'],
          ['warnings', 'common.warnings'],
          ['passed', 'common.passed'],
        ] as const).map(([key, label]) => (
          <div key={key} className={`result-metric result-metric-${key}`} data-empty={totals[key] === 0}>
            <dt>{t(label)}</dt>
            <dd>{totals[key]}</dd>
          </div>
        ))}
      </dl>
      {(totals.manual > 0 || totals.info > 0 || ignored > 0) && (
        <div className="results-additional">
          {totals.manual > 0 && <span>{t('common.manual')}: {totals.manual}</span>}
          {totals.info > 0 && <span>{t('common.info')}: {totals.info}</span>}
          {ignored > 0 && <span>{t('common.ignored')}: {ignored}</span>}
        </div>
      )}
      {findings.length > 0 && (
        <div className="results-findings">
          {findings.map(({ index, bugs, failed, warnings }) => (
            <button key={index} type="button" onClick={() => onReview(index)}>
              <span>{suites[index].label}</span>
              <span className="finding-counts">
                {bugs > 0 && <span>{t('common.bugs')}: {bugs}</span>}
                {failed > 0 && <span>{t('common.failed')}: {failed}</span>}
                {warnings > 0 && <span>{t('common.warnings')}: {warnings}</span>}
                <span aria-hidden="true">↗</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
