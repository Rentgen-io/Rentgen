import Button from 'src/components/buttons/Button';
import { useAppSelector } from 'src/store/hooks';
import { selectPreEvaluationDisabled, selectSelectedRequestId } from 'src/store/selectors';

import PlayIcon from 'src/assets/icons/play-icon.svg';

export default function PreEvaluationPanel() {
  const disabled = useAppSelector(selectPreEvaluationDisabled);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  return (
    <div className="divide-y divide-border">
      <div className="relative flex flex-col gap-4 bg-surface py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <h5 className="m-0">LLM Pre-Evaluation</h5>
          <p className="m-0 text-xs text-muted-foreground">
            Each question runs against the current request and selected environment.
          </p>
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          Demo assertions are editable examples. Adapt them to your model’s language and refusal wording. Matching
          ignores case and treats straight and typographic apostrophes as equivalent. OR forbids any listed phrase; AND
          forbids all phrases appearing together.
        </p>
        {!selectedRequestId && (
          <p className="m-0 text-xs">Save this request to a collection to retain its evaluation and report.</p>
        )}
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
          <span className="@xl:truncate">Run Pre-Evaluation</span>
        </Button>
      </div>
    </div>
  );
}
