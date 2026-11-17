import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import HighlightedTextarea from 'src/components/inputs/HighlightedTextarea';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectHeaders, selectHighlightColor, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { PostmanHeader } from 'src/types';
import { formatHeaderText, isSameHeaders, parseHeaderText } from 'src/utils';

interface Props {
  /** The editor height set by the user; grows with its content when null */
  height: number | null;
}

/**
 * Edits the request headers as text, one `Name: value` per line (e.g. to paste them from the browser or cURL). Every
 * change is written to the store as headers, and the request is autosaved on blur.
 */
export default function HeadersBulkEditor({ height }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const headers = useAppSelector(selectHeaders);
  const highlightColor = useAppSelector(selectHighlightColor);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  // The text is kept as typed (e.g. spaces, empty lines), not rebuilt from the headers it's parsed into
  const [text, setText] = useState<string>(() => formatHeaderText(headers));
  const [syncedHeaders, setSyncedHeaders] = useState<PostmanHeader[]>(headers);

  // Headers changed elsewhere (another request selected, an import): the text starts over from them
  if (!isSameHeaders(headers, syncedHeaders)) {
    setSyncedHeaders(headers);
    setText(formatHeaderText(headers));
  }

  const changeText = (newText: string) => {
    const newHeaders = parseHeaderText(newText);

    setText(newText);
    setSyncedHeaders(newHeaders);
    dispatch(requestActions.setHeaders(newHeaders));
  };

  return (
    <HighlightedTextarea
      className="border-none"
      height={height}
      highlightColor={highlightColor}
      placeholder={t('request.headersPlaceholder')}
      value={text}
      variables={variables}
      onBlur={autoSaveRequest}
      onChange={(event) => changeText(event.target.value)}
    />
  );
}
