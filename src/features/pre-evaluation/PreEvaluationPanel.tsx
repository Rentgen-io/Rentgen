import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Input from 'src/components/inputs/Input';
import Select from 'src/components/inputs/Select';
import { useAppSelector } from 'src/store/hooks';
import { selectPreEvaluationDisabled, selectSelectedRequestId } from 'src/store/selectors';

import AddIcon from 'src/assets/icons/add-icon.svg';
import ExportIcon from 'src/assets/icons/export-icon.svg';
import ImportIcon from 'src/assets/icons/import-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';

export default function PreEvaluationPanel() {
  const { t } = useTranslation();

  const disabled = useAppSelector(selectPreEvaluationDisabled);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  return (
    <div className="divide-y divide-border">
      <div className="relative flex flex-col gap-4 bg-surface py-3 px-4">
        <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-between gap-4 @xl:gap-2">
          <h5 className="m-0">{t('preEvaluation.title')}</h5>
          <p className="m-0 text-xs text-muted-foreground">{t('preEvaluation.runEachQuestion')}</p>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{t('preEvaluation.description')}</p>
        {!selectedRequestId && <p className="m-0 text-xs">{t('preEvaluation.saveRequestMessage')}</p>}
      </div>
      <div className="flex flex-col gap-4 py-3 px-4">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-4">
          <div className="flex-auto flex flex-col @2xl:flex-row @2xl:items-center gap-2">
            <label className="flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.userPromptField')} />
              <Select
                className="flex-1 @2xl:flex-none @2xl:min-w-40"
                placeholder={t('preEvaluation.userPromptPlaceholder')}
                options={[]}
              />
            </label>
            <label className="flex-auto flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.responseTextField')} />
              <Input className="flex-1" placeholder={t('preEvaluation.responseTextPlaceholder')} />
            </label>
            <label className="flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.iterationsPerQuestion')} />
              <Input className="flex-1 @2xl:flex-none @2xl:max-w-20" max={1000} min={1} type="number" />
            </label>
          </div>
          <div className="flex flex-col @xl:flex-row @xl:items-center gap-2">
            <Button className="inline-flex items-center gap-2 truncate">
              <AddIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('preEvaluation.addQuestion')}</span>
            </Button>
            <Button buttonType={ButtonType.SECONDARY} className="inline-flex items-center gap-2 truncate">
              <ImportIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('preEvaluation.importCSV')}</span>
            </Button>
            <Button buttonType={ButtonType.SECONDARY} className="inline-flex items-center gap-2 truncate">
              <ExportIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('preEvaluation.downloadCSVExample')}</span>
            </Button>
          </div>
        </div>
        <p className="m-0 text-xs">{t('preEvaluation.jsonBodyRequirement')}</p>
        <Button
          className="inline-flex items-center gap-2 @xl:w-fit truncate"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
          }}
        >
          <PlayIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('preEvaluation.run')}</span>
        </Button>
      </div>
    </div>
  );
}
