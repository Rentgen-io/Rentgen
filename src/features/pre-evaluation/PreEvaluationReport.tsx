import cn from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { exportFile } from 'src/api/files';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { EvaluationReport } from 'src/types';
import { formatDuration } from 'src/utils';
import { notify } from 'src/utils/toast';

import ExportIcon from 'src/assets/icons/export-icon.svg';

interface Props {
  report: EvaluationReport;
}

export default function PreEvaluationReport({ report }: Props) {
  const { t } = useTranslation();

  const { finishedAt, planned, results, startedAt } = report;
  const failed = results.filter((r) => r.reasons.length);
  const passed = results.length - failed.length;
  const durationMs = finishedAt ? Date.parse(finishedAt) - Date.parse(startedAt) : NaN;
  const duration = durationMs >= 0 ? ` (${formatDuration(durationMs)})` : '';

  const questionStatistics = useMemo(() => {
    const statistics = new Map<string, { id: string; prompt: string; passed: number; total: number }>();

    for (const { prompt, questionId, reasons } of results) {
      const stat = statistics.get(questionId) ?? {
        id: questionId,
        prompt,
        passed: 0,
        total: 0,
      };
      stat.total++;

      if (!reasons.length) stat.passed++;
      statistics.set(questionId, stat);
    }

    return [...statistics.values()];
  }, [results]);

  const exportReport = async (content: string) => {
    try {
      const result = await exportFile({
        defaultPath: `rentgen-pre-evaluation-report-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.json`,
        content,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.exported'), { toastId: 'success-pre-evaluation-export' });
    } catch {
      notify.error(t('common.failed'), { toastId: 'error-pre-evaluation-export' });
    }
  };

  return (
    <div className="flex flex-col gap-4 py-3 px-4">
      <div className="results-heading-row">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h5 className="m-0">{t('preEvaluation.preEvaluationReport')}</h5>
            <p className="m-0 text-xs text-muted-foreground">
              {t('preEvaluation.lastRun', { date: new Date(startedAt) })}
              {duration} · {t('preEvaluation.completed', { completed: results.length, planned })}
            </p>
          </div>
          <Button
            buttonType={ButtonType.SECONDARY}
            className="inline-flex items-center gap-2 truncate"
            onClick={() => exportReport(JSON.stringify(report, null, 2))}
          >
            <ExportIcon className="size-4 shrink-0" />
            <span className="truncate">{t('common.export')}</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 @xl:grid-cols-5 gap-2">
        {[
          [t('preEvaluation.questions'), questionStatistics.length, 'text-metric-bug'],
          [t('preEvaluation.totalRuns'), results.length, 'text-foreground'],
          [t('preEvaluation.passed'), passed, 'text-metric-pass'],
          [t('preEvaluation.failed'), failed.length, 'text-metric-fail'],
          [
            t('preEvaluation.complianceRate'),
            results.length ? `${((passed / results.length) * 100).toFixed(1)}%` : '—',
            'text-metric-pass',
          ],
        ].map(([label, value, color]) => (
          <div key={label} className="flex flex-col gap-2 py-3 px-4 border border-border rounded">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn('text-2xl font-semibold', color)}>{value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 py-3 px-4 border border-border rounded">
        <div className="flex items-center justify-between gap-2">
          <h6 className="m-0 text-xs font-semibold">{t('preEvaluation.resultsPerQuestion')}</h6>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 bg-metric-pass rounded-full" />
              {t('preEvaluation.passed')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 bg-metric-fail rounded-full" />
              {t('preEvaluation.failed')}
            </span>
          </div>
        </div>
        {questionStatistics.map(({ id, passed, prompt, total }, index) => {
          const failed = total - passed;

          return (
            <div key={id} className="flex items-center gap-3 text-xs">
              <span className="w-2/5 truncate" title={prompt}>
                {index + 1}. {prompt}
              </span>
              <div
                className="flex flex-1 h-5 gap-0.5 font-semibold text-white"
                title={`${t('preEvaluation.passed')}: ${passed} · ${t('preEvaluation.failed')}: ${failed}`}
              >
                {passed > 0 && (
                  <span
                    className="flex items-center justify-center min-w-max px-1.5 bg-metric-pass rounded"
                    style={{ flex: `${passed} 1 0` }}
                  >
                    {passed} / {total}
                  </span>
                )}
                {failed > 0 && (
                  <span
                    className="flex items-center justify-center min-w-max px-1.5 bg-metric-fail rounded"
                    style={{ flex: `${failed} 1 0` }}
                  >
                    {passed ? failed : `${failed} / ${total}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
