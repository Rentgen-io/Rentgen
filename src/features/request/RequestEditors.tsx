import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import { MAX_JSON_HIGHLIGHT_LENGTH, shouldHighlightJson } from 'src/components/highlighters/VariableHighlighter';
import HighlightedTextarea from 'src/components/inputs/HighlightedTextarea';
import ResizeHandler from 'src/components/panels/ResizeHandler';
import { useResizableSize } from 'src/hooks/useResizableSize';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectBody, selectHeaders, selectHighlightColor, selectMode, selectVariableNames } from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { PostmanBodyMode } from 'src/types';
import { formatBody, getHeaderValue, parseHeaders } from 'src/utils';

// Height of the headers / body textareas (shared). Until the user resizes them they grow with their content between
// these 112px (min-h-28) and MAX_EDITOR_HEIGHT; the max keeps the response below within reach
const MIN_EDITOR_HEIGHT = 112;
const MAX_EDITOR_HEIGHT = '50vh';

const bodyModeOptions: { label: string; value: PostmanBodyMode | undefined }[] = [
  { label: 'none', value: undefined },
  { label: 'form-data', value: 'formdata' },
  { label: 'x-www-form-urlencoded', value: 'urlencoded' },
  { label: 'raw', value: 'raw' },
];

type EditorTab = 'headers' | 'body';

export default function RequestEditors() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const bodyModeGroupName = useId();

  const body = useAppSelector(selectBody);
  const headers = useAppSelector(selectHeaders);
  const highlightColor = useAppSelector(selectHighlightColor);
  const mode = useAppSelector(selectMode);
  const variables = useAppSelector(selectVariableNames);

  const [activeTab, setActiveTab] = useState<EditorTab>('body');

  const { autoSaveRequest } = useSaveRequest();
  const { handleProps, size, targetRef } = useResizableSize<HTMLDivElement>({
    dimension: 'height',
    maxSize: MAX_EDITOR_HEIGHT,
    minSize: MIN_EDITOR_HEIGHT,
    storageKey: 'requestEditorHeight',
  });

  const bodyMode = body?.mode;
  const bodyRaw = body?.raw ?? '';
  const bodyFields =
    bodyMode === 'formdata' ? body?.formdata : bodyMode === 'urlencoded' ? body?.urlencoded : undefined;
  const editorStyle = { height: size ?? undefined };
  const isWssMode = mode === 'WSS';

  const currentTab: EditorTab = isWssMode ? 'body' : activeTab;
  const isRawEditor = isWssMode || bodyMode === 'raw';
  const tabs: EditorTab[] = isWssMode ? ['body'] : ['headers', 'body'];

  const hasBody = isRawEditor
    ? !!bodyRaw.trim()
    : !!bodyFields?.some(({ key, disabled }: { key: string; disabled?: boolean }) => !!key && !disabled);

  const contentType = useMemo(() => getHeaderValue(parseHeaders(headers), 'content-type'), [headers]);
  const highlightJson = useMemo(
    () => isRawEditor && bodyRaw.length <= MAX_JSON_HIGHLIGHT_LENGTH && shouldHighlightJson(bodyRaw, contentType),
    [bodyRaw, contentType, isRawEditor],
  );

  return (
    <Tabs
      className="relative border-b border-border"
      forceRenderTabPanel
      selectedIndex={tabs.indexOf(currentTab)}
      selectedTabClassName="text-foreground border-primary! cursor-default!"
      selectedTabPanelClassName="block!"
      onSelect={(index) => setActiveTab(tabs[index])}
    >
      <div className="relative">
        <TabList className="flex gap-4 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
          {!isWssMode && (
            <Tab className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer">
              {t('request.headers')} {headers.trim() && <Indicator />}
            </Tab>
          )}
          <Tab className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer">
            {isWssMode ? t('request.message') : t('request.body')} {hasBody && <Indicator />}
          </Tab>
        </TabList>
        {!isWssMode && currentTab === 'body' && (
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 flex gap-2 py-3 px-4 text-foreground"
            role="radiogroup"
            aria-label={t('request.bodyType')}
          >
            {bodyModeOptions.map(({ label, value }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input
                  className="m-0"
                  type="radio"
                  name={bodyModeGroupName}
                  value={label}
                  checked={value === bodyMode}
                  onChange={() => dispatch(requestActions.setBodyMode(value))}
                />
                <span className="text-xs">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div ref={targetRef}>
        {!isWssMode && (
          <TabPanel className="hidden">
            <div className="flex flex-col gap-2 px-1">
              <HighlightedTextarea
                className="border-none"
                height={size}
                highlightColor={highlightColor}
                placeholder={t('request.headersPlaceholder')}
                value={headers}
                variables={variables}
                onBlur={autoSaveRequest}
                onChange={(event) => dispatch(requestActions.setHeaders(event.target.value))}
              />
            </div>
          </TabPanel>
        )}
        <TabPanel className="hidden">
          {isRawEditor ? (
            <div className="relative flex flex-col gap-2 px-1">
              <HighlightedTextarea
                className="border-none"
                height={size}
                highlightColor={highlightColor}
                highlightJson={highlightJson}
                placeholder={isWssMode ? t('request.bodyPlaceholderWss') : t('request.bodyPlaceholderHttp')}
                value={bodyRaw}
                variables={variables}
                onBlur={autoSaveRequest}
                onChange={(event) => dispatch(requestActions.setBodyRaw(event.target.value))}
              />
              <Button
                className="absolute top-3 right-4 z-10"
                buttonSize={ButtonSize.SMALL}
                buttonType={ButtonType.SECONDARY}
                onClick={() => {
                  dispatch(requestActions.setBodyRaw(formatBody(bodyRaw)));
                  autoSaveRequest();
                }}
              >
                {t('common.beautify')}
              </Button>
            </div>
          ) : (
            <>
              {bodyMode === 'formdata' && <div className="min-h-28 box-border" style={editorStyle} />}
              {bodyMode === 'urlencoded' && <div className="min-h-28 box-border" style={editorStyle} />}
              {!bodyMode && (
                <div className="flex items-center justify-center min-h-28 p-3 box-border" style={editorStyle}>
                  <p className="m-0 p-4 text-xs text-muted-foreground">{t('request.noBody')}</p>
                </div>
              )}
            </>
          )}
        </TabPanel>
      </div>
      <ResizeHandler title={t('common.resizeHint')} {...handleProps} />
    </Tabs>
  );
}

function Indicator() {
  return <span className="size-1.5 bg-primary rounded-full" />;
}
