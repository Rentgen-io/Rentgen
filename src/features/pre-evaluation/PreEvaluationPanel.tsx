import Button from 'src/components/buttons/Button';
import { useAppSelector } from 'src/store/hooks';
import { selectPreEvaluationDisabled, selectSelectedRequestId } from 'src/store/selectors';
import { useTranslation } from 'react-i18next';

import PlayIcon from 'src/assets/icons/play-icon.svg';

export default function PreEvaluationPanel() {
  const { t } = useTranslation();

  const disabled = useAppSelector(selectPreEvaluationDisabled);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  return (
    <div className="divide-y divide-border">
      <div className="relative flex flex-col gap-4 bg-surface py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <h5 className="m-0">{t('preEvaluation.title')}</h5>
          <p className="m-0 text-xs text-muted-foreground">{t('preEvaluation.runEachQuestion')}</p>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{t('preEvaluation.description')}</p>
        {!selectedRequestId && <p className="m-0 text-xs">{t('preEvaluation.saveRequestMessage')}</p>}
      </div>
      <div className="py-3 px-4">
        <Button
          className="inline-flex items-center gap-2 @xl:truncate"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
          }}
        >
          <PlayIcon className="h-4 w-4 shrink-0" />
          <span className="@xl:truncate">{t('preEvaluation.run')}</span>
        </Button>
      </div>
    </div>
  );
}
