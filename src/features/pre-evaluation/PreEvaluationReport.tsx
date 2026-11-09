import cn from 'classnames';
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
            <ExportIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('common.export')}</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 @xl:grid-cols-5 gap-2">
        {[
          [t('preEvaluation.questions'), new Set(results.map((result) => result.questionId)).size, 'text-metric-bug'],
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
      <div>
        <h6 className="m-0 text-xs font-semibold">{t('preEvaluation.resultsPerQuestion')}</h6>
      </div>
    </div>
  );
}
