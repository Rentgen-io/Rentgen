import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCollectionData, selectSelectedRequestId } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { ResponsePanelContext } from 'src/types';
import { findRequestWithFolder } from 'src/utils';
import ContextMenuItem from './ContextMenuItem';

// Input types supporting the text selection API (selectionStart / setRangeText). Others, e.g. number, email, checkbox
// or radio, throw on setRangeText and have no text to cut / paste into
const TEXT_INPUT_TYPES = new Set(['password', 'search', 'tel', 'text', 'url']);

interface Props {
  htmlElement: HTMLElement | null;
  responsePanelContext: ResponsePanelContext | null;
  selectedText: string;
  onClose: () => void;
}

/**
 * The menu's actions. Only mounted while the menu is open (ContextMenu renders nothing when closed), so the collection /
 * selection subscriptions below exist only then, not for the whole app lifetime.
 */
export default function GlobalContextMenuItems({ htmlElement, responsePanelContext, selectedText, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const collection = useAppSelector(selectCollectionData);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  // Is the current request saved in the collection (needed for "Set as variable"), and in which folder
  const currentRequestWithFolder = selectedRequestId ? findRequestWithFolder(collection, selectedRequestId) : null;
  // Trimmed only for this check: whitespace-only selections disable the actions, but what's copied is never trimmed
  const hasSelection = selectedText.trim().length > 0;
  const isEditable = isEditableTextField(htmlElement);

  // Clipboard calls can reject (permission / focus): `finally` makes sure the menu still closes
  const handleCut = async () => {
    try {
      if (!isEditableTextField(htmlElement)) return;

      const start = htmlElement.selectionStart ?? 0;
      const end = htmlElement.selectionEnd ?? 0;
      // The exact selected range, so what is removed from the field is exactly what is copied
      const text = htmlElement.value.slice(start, end);
      if (!text) return;

      await navigator.clipboard.writeText(text);
      replaceSelection(htmlElement, '', start, end);
    } finally {
      onClose();
    }
  };

  const handleCopy = async () => {
    try {
      let text = selectedText;

      if (isTextField(htmlElement)) {
        htmlElement.focus();
        text = htmlElement.value.slice(htmlElement.selectionStart ?? 0, htmlElement.selectionEnd ?? 0) || selectedText;
      }

      await navigator.clipboard.writeText(text);
    } finally {
      onClose();
    }
  };

  const handlePaste = async () => {
    try {
      if (!isEditableTextField(htmlElement)) return;

      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      replaceSelection(htmlElement, clipboardText, htmlElement.selectionStart ?? 0, htmlElement.selectionEnd ?? 0);
    } finally {
      onClose();
    }
  };

  const handleSetAsVariable = () => {
    if (!currentRequestWithFolder || !selectedRequestId) return;

    const { folder, request } = currentRequestWithFolder;
    dispatch(
      modalsActions.openSetAsDynamicVariableModal({
        initialSelector: responsePanelContext?.jsonPath || selectedText.trim(),
        initialValue: responsePanelContext?.jsonValue || selectedText.trim(),
        collectionName: folder.name,
        requestId: selectedRequestId,
        requestName: request.name,
        source: responsePanelContext?.source || 'body',
      }),
    );
    onClose();
  };

  return (
    <>
      {isEditable && <ContextMenuItem label={t('common.cut')} onClick={handleCut} disabled={!hasSelection} />}
      <ContextMenuItem label={t('common.copy')} onClick={handleCopy} disabled={!hasSelection} />
      {isEditable && <ContextMenuItem label={t('common.paste')} onClick={handlePaste} />}
      {responsePanelContext && (
        <ContextMenuItem
          label={t('contextMenu.setAsVariable')}
          onClick={handleSetAsVariable}
          disabled={!hasSelection || !currentRequestWithFolder}
          title={!currentRequestWithFolder ? t('contextMenu.saveRequestFirst') : undefined}
          divider
        />
      )}
    </>
  );
}

/** A text field whose selected text can be read (also read-only / disabled ones, for copying). */
export function isTextField(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type))
  );
}

/** A text field the user can change: the only ones offering cut / paste. */
function isEditableTextField(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return isTextField(element) && !element.readOnly && !element.disabled;
}

/**
 * Replaces the field's text between start and end (deletes it when `text` is empty). Uses the browser's editing
 * commands, so the change is part of the field's undo history (Ctrl+Z) and fires a native input event (React onChange).
 * execCommand is deprecated but still the only API for this; setRangeText is the fallback (without undo).
 */
function replaceSelection(field: HTMLInputElement | HTMLTextAreaElement, text: string, start: number, end: number) {
  field.focus();
  field.setSelectionRange(start, end);

  const isEdited = text ? document.execCommand('insertText', false, text) : document.execCommand('delete');

  if (!isEdited) {
    field.setRangeText(text, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
