import { openExternal } from 'src/api/system';
import { hidePrompt } from 'src/utils';
import Button, { ButtonSize, ButtonType } from '../buttons/Button';
import Modal from './Modal';

interface Props {
  actionLabel: string;
  actionUrl: string;
  isOpen: boolean;
  laterLabel: string;
  messages: string[];
  neverAskAgainLabel: string;
  snoozeMs: number;
  storageKey: string;
  title: string;
  onClose: () => void;
}

/**
 * A prompt asking for support (opened by useTestRunEndPrompts): "Never ask again" and the action hide it for good,
 * "Later" or clicking outside hide it for `snoozeMs`.
 */
export default function PromptModal({
  actionLabel,
  actionUrl,
  isOpen,
  laterLabel,
  messages,
  neverAskAgainLabel,
  snoozeMs,
  storageKey,
  title,
  onClose,
}: Props) {
  const close = (hideForMs?: number) => {
    hidePrompt(storageKey, hideForMs);
    onClose();
  };

  return (
    <Modal className="[&>div]:w-100!" isOpen={isOpen} onClose={() => close(snoozeMs)}>
      <div className="flex flex-col gap-4">
        <h5 className="m-0">{title}</h5>
        {messages.map((message) => (
          <p key={message} className="m-0 text-xs text-muted-foreground">
            {message}
          </p>
        ))}
        <div className="flex items-center justify-end gap-2">
          <Button buttonSize={ButtonSize.SMALL} buttonType={ButtonType.SECONDARY_OUTLINE} onClick={() => close()}>
            {neverAskAgainLabel}
          </Button>
          <Button buttonSize={ButtonSize.SMALL} buttonType={ButtonType.SECONDARY} onClick={() => close(snoozeMs)}>
            {laterLabel}
          </Button>
          <Button
            buttonSize={ButtonSize.SMALL}
            onClick={() => {
              openExternal(actionUrl);
              close();
            }}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
