import { useEffect, useMemo, useRef, useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { useTranslation } from 'react-i18next';
import { exportFile } from 'src/api/files';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import { RadioButtons, RadioOption } from 'src/components/buttons/RadioButtons';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Input from 'src/components/inputs/Input';
import Select from 'src/components/inputs/Select';
import TextareaAutosize from 'src/components/inputs/TextareaAutosize';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import ProgressBar from 'src/components/loaders/ProgressBar';
import {
  DEFAULT_EVALUATION_QUESTIONS,
  DEFAULT_PRE_EVALUATION,
  MAX_ITERATIONS,
  MIN_ITERATIONS,
} from 'src/constants/pre-evaluation';
import usePreEvaluation from 'src/hooks/usePreEvaluation';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCurrentRun,
  selectEvaluationReport,
  selectIsPreEvaluationRunning,
  selectPreEvaluation,
  selectPreEvaluationDisabled,
  selectPreEvaluationTotalRuns,
  selectPromptPathOptions,
  selectSelectedRequestId,
} from 'src/store/selectors';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { EvaluationQuestion, MatchMode } from 'src/types';
import { parseCsv, toCsv } from 'src/utils';
import { notify } from 'src/utils/toast';
import PreEvaluationReport from './PreEvaluationReport';

import AddIcon from 'src/assets/icons/add-icon.svg';
import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import ExportIcon from 'src/assets/icons/export-icon.svg';
import ImportIcon from 'src/assets/icons/import-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';
import TrashIcon from 'src/assets/icons/trash-icon.svg';

const modeOptions: RadioOption<MatchMode>[] = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
];

export default function PreEvaluationPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { executePreEvaluation, stopPreEvaluation } = usePreEvaluation();

  const disabled = useAppSelector(selectPreEvaluationDisabled);
  const evaluationReport = useAppSelector(selectEvaluationReport);
  const isRunningPreEvaluation = useAppSelector(selectIsPreEvaluationRunning);
  const preEvaluation = useAppSelector(selectPreEvaluation) ?? DEFAULT_PRE_EVALUATION;
  const promptPathOptions = useAppSelector(selectPromptPathOptions);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [iterations, setIterations] = useState<string>(String(preEvaluation.iterations));
  const [responsePath, setResponsePath] = useState<string>(preEvaluation.responsePath);

  const selectedPromptPath = promptPathOptions.find((option) => option.value === preEvaluation.promptPath) ?? null;

  const columns = useMemo<TableColumn<EvaluationQuestion>[]>(() => {
    const updateQuestion = (id: string, changes: Partial<Omit<EvaluationQuestion, 'id'>>) =>
      dispatch(preEvaluationActions.updatePreEvaluationQuestion({ id, changes }));

    return [
      {
        name: '#',
        cell: (_, index) => index + 1,
        width: '48px',
        center: true,
        style: {
          fontSize: '12px',
          color: 'var(--color-foreground)',
        },
      },
      {
        name: t('preEvaluation.questionColumn'),
        cell: ({ id, prompt }) => (
          <QuestionPromptInput prompt={prompt} onBlur={(value) => updateQuestion(id, { prompt: value })} />
        ),
      },
      {
        name: t('preEvaluation.containsColumn'),
        cell: ({ contains, containsMode, id }) => (
          <AssertionControls
            assertions={contains}
            name={`containsMode-${id}`}
            mode={containsMode}
            onAssertionsChange={(assertions) => updateQuestion(id, { contains: assertions })}
            onModeChange={(mode) => updateQuestion(id, { containsMode: mode })}
          />
        ),
      },
      {
        name: t('preEvaluation.notContainsColumn'),
        cell: ({ notContains, notContainsMode, id }) => (
          <AssertionControls
            assertions={notContains}
            name={`notContainsMode-${id}`}
            mode={notContainsMode}
            onAssertionsChange={(assertions) => updateQuestion(id, { notContains: assertions })}
            onModeChange={(mode) => updateQuestion(id, { notContainsMode: mode })}
          />
        ),
      },
      {
        cell: ({ id }) => (
          <TrashIcon
            className="size-3 text-muted-foreground hover:text-red-600 cursor-pointer"
            onClick={() => dispatch(preEvaluationActions.removePreEvaluationQuestion(id))}
          />
        ),
        width: '40px',
        center: true,
      },
    ];
  }, [dispatch, t]);

  useEffect(() => setIterations(String(preEvaluation.iterations)), [preEvaluation.iterations]);
  useEffect(() => setResponsePath(preEvaluation.responsePath), [preEvaluation.responsePath]);

  const saveFile = async (content: string) => {
    try {
      const result = await exportFile({
        defaultPath: `pre-evaluation-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.csv`,
        content,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.exported'), { toastId: 'success-pre-evaluation-export' });
    } catch {
      notify.error(t('common.failed'), { toastId: 'error-pre-evaluation-export' });
    }
  };

  const renderAddButton = (buttonType?: ButtonType) => (
    <Button
      buttonType={buttonType}
      className="inline-flex items-center gap-2 truncate"
      onClick={() => dispatch(preEvaluationActions.addPreEvaluationQuestion())}
    >
      <AddIcon className="size-4 shrink-0" />
      <span className="truncate">{t('preEvaluation.addQuestion')}</span>
    </Button>
  );

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
      <div className="relative flex flex-col gap-4 py-3 px-4">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-4">
          <div className="flex-auto flex flex-col @2xl:flex-row @2xl:items-center gap-2">
            <label className="flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.userPromptField')} required />
              <Select
                className="flex-1 @2xl:flex-none @2xl:max-w-80 @2xl:min-w-40"
                isSearchable={false}
                options={promptPathOptions}
                placeholder={t('preEvaluation.userPromptPlaceholder')}
                value={selectedPromptPath}
                onChange={(option) => {
                  if (option) dispatch(preEvaluationActions.updatePreEvaluation({ promptPath: option.value }));
                }}
              />
            </label>
            <label className="flex-auto flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.responseTextField')} />
              <Input
                className="flex-1"
                placeholder={t('preEvaluation.responseTextPlaceholder')}
                value={responsePath}
                onBlur={() => {
                  if (responsePath !== preEvaluation.responsePath)
                    dispatch(preEvaluationActions.updatePreEvaluation({ responsePath }));
                }}
                onChange={(event) => setResponsePath(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <FieldLabel label={t('preEvaluation.iterationsPerQuestion')} />
              <Input
                className="flex-1 @2xl:flex-none @2xl:max-w-20"
                max={MAX_ITERATIONS}
                min={MIN_ITERATIONS}
                type="number"
                value={iterations}
                onBlur={() => {
                  const value = Math.min(MAX_ITERATIONS, Math.max(MIN_ITERATIONS, Math.floor(Number(iterations)) || 1));
                  setIterations(String(value));

                  if (value !== preEvaluation.iterations)
                    dispatch(preEvaluationActions.updatePreEvaluation({ iterations: value }));
                }}
                onChange={(event) => setIterations(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-col @xl:flex-row @xl:items-center gap-2">
            {renderAddButton()}
            <Button
              buttonType={ButtonType.SECONDARY}
              className="inline-flex items-center gap-2 truncate"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImportIcon className="size-4 shrink-0" />
              <span className="truncate">{t('preEvaluation.importCSV')}</span>
            </Button>
            <input
              accept=".csv,text/csv"
              className="sr-only"
              ref={fileInputRef}
              tabIndex={-1}
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';

                if (!file) return;

                try {
                  const questions = parseCsv(await file.text());
                  dispatch(preEvaluationActions.setPreEvaluationQuestions(questions));

                  notify.success(t('common.imported'), { toastId: 'success-pre-evaluation-import' });
                } catch (error) {
                  notify.error(error instanceof Error ? error.message : String(error), {
                    toastId: 'error-pre-evaluation-import',
                  });
                }
              }}
            />
            <Button
              buttonType={ButtonType.SECONDARY}
              className="inline-flex items-center gap-2 truncate"
              onClick={() => {
                const questions = preEvaluation.questions.length
                  ? preEvaluation.questions
                  : DEFAULT_EVALUATION_QUESTIONS;
                saveFile(toCsv(questions));
              }}
            >
              <ExportIcon className="size-4 shrink-0" />
              <span className="truncate">{t('preEvaluation.exportCSVExample')}</span>
            </Button>
          </div>
        </div>
        <p className="m-0 text-xs">{t('preEvaluation.jsonBodyRequirement')}</p>
        <DataTable
          className="pre-evaluation-data-table"
          columns={columns}
          data={preEvaluation.questions}
          noDataComponent={<div className="p-4">{renderAddButton(ButtonType.SECONDARY_OUTLINE)}</div>}
        />
        {!isRunningPreEvaluation ? (
          <Button
            className="inline-flex items-center gap-2 @xl:w-fit truncate"
            disabled={disabled}
            onClick={async () => {
              if (disabled) return;

              try {
                await executePreEvaluation();
              } catch (error) {
                notify.error(error instanceof Error ? error.message : String(error), {
                  toastId: 'error-pre-evaluation-run',
                });
              }
            }}
          >
            <PlayIcon className="size-4 shrink-0" />
            <span className="truncate">{t('preEvaluation.runPreEvaluation')}</span>
          </Button>
        ) : (
          <PreEvaluationProgress onStop={stopPreEvaluation} />
        )}
      </div>
      {evaluationReport && <PreEvaluationReport report={evaluationReport} />}
    </div>
  );
}

function PreEvaluationProgress({ onStop }: { onStop: () => void }) {
  const { t } = useTranslation();

  const currentRun = useAppSelector(selectCurrentRun);
  const totalRuns = useAppSelector(selectPreEvaluationTotalRuns);

  return (
    <>
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between gap-2">
        <Button className="inline-flex items-center gap-2 @lg:w-fit truncate" onClick={onStop}>
          <StopIcon className="size-4 shrink-0" />
          <span className="truncate">{t('common.stop')}</span>
        </Button>
        <LoaderWithText
          className="w-auto text-xs font-normal [&_.loader]:size-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
          text={t('preEvaluation.running', { current: currentRun, total: totalRuns })}
        />
      </div>
      <ProgressBar className="absolute bottom-0 left-0" max={totalRuns} value={currentRun} />
    </>
  );
}

function QuestionPromptInput({ prompt, onBlur }: { prompt: string; onBlur: (prompt: string) => void }) {
  const [value, setValue] = useState<string>(prompt);

  useEffect(() => setValue(prompt), [prompt]);

  return (
    <TextareaAutosize
      className="min-h-auto w-full my-1.5 mx-2.5"
      maxRows={3}
      value={value}
      onBlur={() => {
        if (value !== prompt) onBlur(value);
      }}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function AssertionControls({
  assertions,
  name,
  mode,
  onAssertionsChange,
  onModeChange,
}: {
  assertions: string[];
  name: string;
  mode: MatchMode;
  onAssertionsChange: (assertions: string[]) => void;
  onModeChange: (mode: MatchMode) => void;
}) {
  const { t } = useTranslation();

  const [isAdding, setIsAdding] = useState<boolean>(false);

  const addAssertion = (value: string) => {
    const newAssertion = value.trim();
    const isDuplicate = assertions.some((assertion) => assertion.toLowerCase() === newAssertion.toLowerCase());

    if (newAssertion && !isDuplicate) onAssertionsChange([...assertions, newAssertion]);
  };

  return (
    <div className="flex h-full w-full min-w-0 divide-x divide-border">
      <div className="flex items-center py-1.5 px-2.5">
        <RadioButtons name={name} options={modeOptions} value={mode} onChange={(newMode) => onModeChange(newMode)} />
      </div>
      <div className="flex flex-auto items-center flex-wrap gap-2 h-fit min-w-0 py-1.5 px-2.5 text-foreground">
        {assertions.map((assertion, index) => (
          <div
            className="flex items-center gap-1 py-0.5 pl-1 text-[11px] bg-secondary rounded truncate"
            key={index}
            title={assertion}
          >
            <span className="truncate">{assertion}</span>
            <ClearCrossIcon
              className="size-3.5 shrink-0 hover:text-red-600 cursor-pointer"
              onClick={() => onAssertionsChange(assertions.filter((_, i) => i !== index))}
            />
          </div>
        ))}
        {!isAdding && (
          <Button
            buttonSize={ButtonSize.SMALL}
            buttonType={ButtonType.SECONDARY_OUTLINE}
            className="inline-flex items-center gap-1 pl-1 text-[11px]! leading-[1.2] truncate"
            onClick={() => setIsAdding(true)}
          >
            <AddIcon className="size-2.5 shrink-0" />
            {t('common.add')}
          </Button>
        )}
        {isAdding && (
          <input
            autoFocus
            type="text"
            className="flex-auto py-0.5 px-1 text-[11px] leading-[1.2] font-monospace text-foreground placeholder:text-muted-foreground bg-background border border-blue-300 rounded outline-none"
            placeholder={t('preEvaluation.addTextPlaceholder')}
            onBlur={(e) => {
              addAssertion(e.currentTarget.value);
              setIsAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key !== 'Enter' && e.key !== 'Escape') return;
              if (e.key === 'Enter') addAssertion(e.currentTarget.value);

              e.currentTarget.value = '';
              setIsAdding(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
