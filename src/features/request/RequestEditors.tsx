import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Button, { ButtonSize, ButtonType } from 'src/components/buttons/Button';
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
import { formatBody, parseHeaders } from 'src/utils';

export default function RequestEditors() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const mode = useAppSelector(selectMode);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectVariableNames);

  const { autoSaveRequest } = useSaveRequest();

  return (
    <Tabs
      className="request-editors"
      defaultIndex={mode === 'WSS' ? 1 : 0}
      forceRenderTabPanel
      selectedTabClassName="editor-tab-active"
      selectedTabPanelClassName="editor-panel-active"
    >
      <TabList className="editor-tabs">
        <Tab className="editor-tab">
          {t('request.headers')} {headers.trim() && <span className="editor-tab-dot" />}
        </Tab>
        <Tab className="editor-tab">
          {t('request.body')} {body.trim() && <span className="editor-tab-dot" />}
        </Tab>
      </TabList>
      <TabPanel className="editor-panel">
        <div className="flex flex-col gap-2">
          <HighlightedTextarea
            className="request-code-editor"
            aria-label={t('request.headers')}
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
      <TabPanel className="editor-panel">
        <div className="relative flex flex-col gap-2">
          <div className="relative @2xl:static">
            <HighlightedTextarea
              className="request-code-editor"
              aria-label={t('request.body')}
              highlightColor={selectedEnvironment?.color}
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
        </div>
      </TabPanel>
    </Tabs>
  );
}
