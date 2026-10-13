import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { useAppSelector } from 'src/store/hooks';
import { selectActiveAiProvider, selectTestOptions } from 'src/store/selectors';

interface Props {
  onCancel?(): void;
}

export function AiRequestMaskControls({ onCancel }: Props) {
  const { t } = useTranslation();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const testOptions = useAppSelector(selectTestOptions);

  const [masked] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-4 pb-4 border-b border-border dark:border-dark-body">
        <div className="flex-auto">
          <h5 className="m-0 mb-1">Review data sent to AI</h5>
          <p className="m-0 text-xs text-text-secondary">
            Select values to mask. Automatic suggestions are already selected.
          </p>
        </div>
        <div className="text-xs">
          {activeAiProvider?.name} · {activeAiProvider?.model}
        </div>
      </div>
      <div className="flex flex-col @2xl:flex-row border border-border dark:border-dark-body divide-y @2xl:divide-y-0 @2xl:divide-x divide-border dark:divide-dark-body">
        <div className="flex-1">
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 text-sm font-bold truncate">
            Request fields
            <span className="font-normal text-xs text-text-secondary truncate">{masked.length} masked</span>
          </label>
          <div className="flex border-t border-border dark:border-dark-body flex-col gap-2 py-2 px-4">
            {Object.entries(testOptions?.headers ?? {}).map(([key, value]) => (
              <div key={key} className="flex items-center text-xs">
                <input type="checkbox" />
                <span className="flex-1">{key}</span>
                <span className="flex-1 font-medium truncate">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="flex items-center justify-between gap-4 m-0 py-2 px-4 text-sm font-bold truncate">
            Sanitized preview<span className="font-normal text-xs text-text-secondary truncate">Ready to send</span>
          </label>
          <div className="border-t border-border dark:border-dark-body py-2 px-4"></div>
        </div>
      </div>
      <div className="flex flex-col @xl:flex-row @xl:items-center @xl:justify-end gap-4 @xl:gap-2 @xl:min-w-0">
        <Button buttonType={ButtonType.SECONDARY} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => {}}>Generate Additional Tests</Button>
      </div>
    </div>
  );
}
