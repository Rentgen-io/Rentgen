import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
import { MAX_JSON_HIGHLIGHT_LENGTH, shouldHighlightJson } from 'src/components/highlighters/VariableHighlighter';
import HighlightedTextarea from 'src/components/inputs/HighlightedTextarea';
import { useSaveRequest } from 'src/hooks/useSaveRequest';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectHeaders,
  selectMode,
  selectSelectedEnvironment,
  selectVariableNames,
} from 'src/store/selectors';
import { requestActions } from 'src/store/slices/requestSlice';
import { formatBody, getHeaderValue, parseHeaders } from 'src/utils';

export default function RequestEditors() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { autoSaveRequest } = useSaveRequest();

  const body = useAppSelector(selectBody);
  const headers = useAppSelector(selectHeaders);
  const mode = useAppSelector(selectMode);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectVariableNames);

  const [activeTab, setActiveTab] = useState<number>(1);

  useEffect(() => setActiveTab(1), [mode]);

  return (
    <Tabs
      className="border-b border-border"
      forceRenderTabPanel
      selectedIndex={activeTab}
      selectedTabClassName="text-foreground border-primary! cursor-default!"
      selectedTabPanelClassName="block!"
      onSelect={(index) => {
        setActiveTab(index);
      }}
    >
      <TabList className="flex gap-4 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border">
        <Tab className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer">
          {t('request.headers')} {headers.trim() && <span className="size-1.5 bg-primary rounded-full" />}
        </Tab>
        <Tab className="flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none cursor-pointer">
          {t('request.body')} {body.trim() && <span className="size-1.5 bg-primary rounded-full" />}
        </Tab>
      </TabList>
      <TabPanel className="hidden">
        <div className="flex flex-col gap-2 px-1">
          <HighlightedTextarea
            className="border-none"
            highlightColor={selectedEnvironment?.color}
            maxRows={15}
            placeholder={t('request.headersPlaceholder')}
            value={headers}
            variables={variables}
            onBlur={autoSaveRequest}
            onChange={(event) => dispatch(requestActions.setHeaders(event.target.value))}
          />
        </div>
      </TabPanel>
      <TabPanel className="hidden">
        <div className="relative flex flex-col gap-2 px-1">
          <HighlightedTextarea
            className="border-none"
            highlightColor={selectedEnvironment?.color}
            highlightJson={
              body.length <= MAX_JSON_HIGHLIGHT_LENGTH &&
              shouldHighlightJson(body, getHeaderValue(parseHeaders(headers), 'content-type'))
            }
            maxRows={15}
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
      </TabPanel>
    </Tabs>
  );
}
