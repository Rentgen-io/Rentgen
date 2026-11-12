import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import { MAX_JSON_HIGHLIGHT_LENGTH, shouldHighlightJson } from 'src/components/highlighters/VariableHighlighter';
import HighlightedTextarea from 'src/components/inputs/HighlightedTextarea';
import ResizeHandler from 'src/components/panels/ResizeHandler';
import { useResizableSize } from 'src/hooks/useResizableSize';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectBodyMode,
  selectFormData,
  selectHeaders,
  selectMode,
  selectSelectedEnvironment,
  selectVariableNames,
} from 'src/store/selectors';
import { BodyMode, requestActions } from 'src/store/slices/requestSlice';
import { formatBody, getHeaderValue, parseHeaders } from 'src/utils';

// Height of the headers / body textareas (shared). Until the user resizes them they grow with their content between
// these 112px (min-h-28) and MAX_ROWS lines; the max keeps the response below within reach
const MIN_EDITOR_HEIGHT = 112;
const MAX_EDITOR_HEIGHT = '50vh';

const bodyModeOptions: { label: string; value: BodyMode }[] = [
  { label: 'none', value: 'none' },
  { label: 'form-data', value: 'formdata' },
  { label: 'raw', value: 'raw' },
];

export default function RequestEditors() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const body = useAppSelector(selectBody);
  const bodyMode = useAppSelector(selectBodyMode);
  const formData = useAppSelector(selectFormData);
  const headers = useAppSelector(selectHeaders);
  const mode = useAppSelector(selectMode);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectVariableNames);

  const [activeTab, setActiveTab] = useState<number>(1);

  const { autoSaveRequest } = useSaveRequest();
  const { handleProps, size, targetRef } = useResizableSize<HTMLDivElement>({
    dimension: 'height',
    maxSize: MAX_EDITOR_HEIGHT,
    minSize: MIN_EDITOR_HEIGHT,
    storageKey: 'requestEditorHeight',
  });

  const editorTabs = useMemo(
    () => [
      {
        component: (
          <div className="flex flex-col gap-2 px-1">
            <HighlightedTextarea
              className="border-none"
              height={size}
              highlightColor={selectedEnvironment?.color}
              placeholder={t('request.headersPlaceholder')}
              value={headers}
              variables={variables}
              onBlur={autoSaveRequest}
              onChange={(event) => dispatch(requestActions.setHeaders(event.target.value))}
            />
          </div>
        ),
        label: (
          <>
            {t('request.headers')} {headers.trim() && <span className="size-1.5 bg-primary rounded-full" />}
          </>
        ),
      },
      {
        component: (
          <>
            {mode === 'HTTP' && (bodyMode === 'none' || bodyMode === 'formdata') && (
              <div
                className={cn('min-h-28 p-3 box-border', { 'flex items-center justify-center': bodyMode === 'none' })}
                style={{ ...(size != null ? { height: size } : {}) }}
              >
                {bodyMode === 'none' && (
                  <p className="m-0 p-4 text-xs text-muted-foreground">This request does not have a body</p>
                )}
                {bodyMode === 'formdata' && (
                  <p className="m-0 p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                    {formData
                      .map(({ key, value, src }) => `${key}: ${src ? ` (src: ${src.join(', ')})` : value}`)
                      .join('\n')}
                  </p>
                )}
              </div>
            )}
            {(mode === 'WSS' || bodyMode === 'raw') && (
              <div className="relative flex flex-col gap-2 px-1">
                <HighlightedTextarea
                  className="border-none"
                  height={size}
                  highlightColor={selectedEnvironment?.color}
                  highlightJson={
                    body.length <= MAX_JSON_HIGHLIGHT_LENGTH &&
                    shouldHighlightJson(body, getHeaderValue(parseHeaders(headers), 'content-type'))
                  }
                  placeholder={mode === 'HTTP' ? t('request.bodyPlaceholderHttp') : t('request.bodyPlaceholderWss')}
                  value={body}
                  variables={variables}
                  onBlur={autoSaveRequest}
                  onChange={(event) => dispatch(requestActions.setBody(event.target.value))}
                />
                <Button
                  className="absolute top-3 right-4 z-10"
                  buttonSize={ButtonSize.SMALL}
                  buttonType={ButtonType.SECONDARY}
                  onBlur={autoSaveRequest}
                  onClick={() => dispatch(requestActions.setBody(formatBody(body, parseHeaders(headers))))}
                >
                  {t('common.beautify')}
                </Button>
              </div>
            )}
          </>
        ),
        label: (
          <>
            {t('request.body')} {body.trim() && <span className="size-1.5 bg-primary rounded-full" />}
            {activeTab === 1 && mode === 'HTTP' && (
              <div className="absolute top-1/2 -translate-y-1/2 right-0 flex gap-2 py-3 px-4">
                {bodyModeOptions.map(({ label, value }) => (
                  <label key={value} className="flex items-center gap-2 font-normal cursor-pointer">
                    <input
                      className="m-0"
                      type="radio"
                      name="bodyType"
                      value={value}
                      checked={value === bodyMode}
                      onChange={() => dispatch(requestActions.setBodyMode(value))}
                    />
                    <span className="text-xs">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        ),
      },
    ],
    [activeTab, body, bodyMode, formData, headers, mode, selectedEnvironment, size, variables, dispatch, t],
  );

  useEffect(() => setActiveTab(1), [mode]);

  return (
    <Tabs
      className="relative border-b border-border"
      forceRenderTabPanel
      selectedIndex={activeTab}
      selectedTabClassName="text-foreground border-primary! cursor-default!"
      selectedTabPanelClassName="block!"
      onSelect={(index) => {
        setActiveTab(index);
      }}
    >
      <TabList className="relative flex gap-4 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
        {editorTabs.map(({ label }, index) => (
          <Tab
            key={index}
            className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer"
          >
            {label}
          </Tab>
        ))}
      </TabList>
      <div ref={targetRef}>
        {editorTabs.map(({ component }, index) => (
          <TabPanel key={index} className="hidden">
            {component}
          </TabPanel>
        ))}
      </div>
      <ResizeHandler title={t('common.resizeHint')} {...handleProps} />
    </Tabs>
  );
}
