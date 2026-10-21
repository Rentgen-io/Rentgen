import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { Accordion } from 'src/components/accordion/Accordion';
import { AccordionItem } from 'src/components/accordion/AccordionItem';
import Button from 'src/components/buttons/Button';
import { Controls } from 'src/components/controls/Controls';
import SimpleSelect from 'src/components/inputs/SimpleSelect';
import { validateSerialNumber } from 'src/features/settings/ai/AiLicenseSettings';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectAiActiveTab,
  selectRunningAiTests,
  selectSelectedRequestId,
  selectSerialNumber,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import {
  determineRequestParameterTestStatus,
  determineTestStatus,
  ERROR_RESPONSE_EXPECTED,
  SUCCESS_RESPONSE_EXPECTED,
} from 'src/test-engine';
import { AiRequestMaskControls } from '../controls/AiRequestMaskControls';
import TestsTable, { ExpandedTestComponent, getTestsTableColumns, TestsTableHeader } from '../tables/TestsTable';

export default function AiTestingPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { aiOverview, aiTests, aiUsage, isRunningTests, cancelAiTestsGeneration, executeAiTest } = useTests();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const aiActiveTab = useAppSelector(selectAiActiveTab);
  const runningAiTests = useAppSelector(selectRunningAiTests);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const serialNumber = useAppSelector(selectSerialNumber);

  const [showAiRequestMaskControls, setShowAiRequestMaskControls] = useState<boolean>(false);

  useEffect(() => cancelAiTestsGeneration, [cancelAiTestsGeneration]);

  return (
    <>
      <TestsTableHeader tests={aiTests ?? []} onOpenSettings={() => dispatch(modalsActions.openSettingsModal(2))} />
      {aiOverview || (aiTests && aiTests.length > 0) ? (
        <div className="flex flex-col gap-4">
          <div>
            <h5 className="m-0 mb-1">{t('ai.summary')}</h5>
            <p className="m-0 text-xs text-text-secondary">{aiOverview?.summary ?? '-'}</p>
          </div>
          <Tabs
            forceRenderTabPanel={true}
            selectedIndex={aiActiveTab}
            selectedTabClassName="text-text dark:text-dark-text border-blue-500! cursor-default!"
            selectedTabPanelClassName="flex! flex-col gap-4"
            onSelect={(index) => {
              dispatch(uiActions.setAiActiveTab(index));
            }}
          >
            <TabList className="m-0 mb-6 p-0 flex gap-4 text-sm font-medium text-text-secondary">
              <Tab className="pb-1 list-none border-b border-transparent outline-none cursor-pointer">
                {t('ai.overview')}
              </Tab>
              <Tab className="pb-1 flex items-center gap-2 border-b border-transparent list-none outline-none cursor-pointer">
                {t('ai.tests')}
                <span className="min-w-5 py-0.5 px-1.5 font-normal text-xs text-text-secondary bg-text-secondary/10 box-border">
                  {aiTests?.length ?? 0}
                </span>
              </Tab>
            </TabList>
            <TabPanel className="hidden">
              <h5 className="flex items-center gap-2 m-0 font-medium">
                {t('ai.topFindings')}
                <span className="font-normal text-xs text-text-secondary">{aiOverview?.topIssues.length ?? 0}</span>
              </h5>
              {aiOverview?.topIssues.length && (
                <Accordion
                  className="divide-y divide-border dark:divide-dark-border"
                  items={aiOverview.topIssues.map(({ evidence, impact, title }, index) => ({
                    content: (
                      <div className="flex flex-col gap-2 ml-7 pb-3 text-xs text-text-secondary">
                        <div className="flex flex-col gap-2 p-4 bg-body dark:bg-dark-body">
                          <label className="font-bold">{t('ai.evidence')}</label>
                          <p className="m-0">{evidence}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-bold">{t('ai.impact')}</label>
                          <p className="m-0">{impact}</p>
                        </div>
                      </div>
                    ),
                    title: (
                      <h5 className="flex items-center gap-2 py-3 m-0 font-medium">
                        <span className="min-w-5 py-0.5 px-1.5 font-normal text-xs text-text-secondary bg-text-secondary/10 box-border">
                          {index + 1}
                        </span>
                        {title}
                      </h5>
                    ),
                  }))}
                />
              )}
              <AccordionItem
                content={
                  <div className="flex flex-col gap-4 pt-4 text-xs">
                    {(aiOverview?.attentionPoints ?? []).map((point, index) => (
                      <p key={index} className="m-0">
                        {point}
                      </p>
                    ))}
                  </div>
                }
                title={
                  <h5 className="flex items-center gap-2 m-0 font-medium">
                    {t('ai.needsInvestigation')}
                    <span className="font-normal text-xs text-text-secondary">
                      {aiOverview?.attentionPoints.length ?? 0}
                    </span>
                  </h5>
                }
              />
            </TabPanel>
            <TabPanel className="hidden">
              <TestsTable
                columns={[
                  {
                    name: t('tables.check'),
                    selector: (row, id) => (
                      <div
                        className="py-1 px-0 line-clamp-4 whitespace-normal"
                        data-column-id={id}
                        data-tag="allowRowEvents"
                      >
                        {row.name}
                      </div>
                    ),
                  },
                  {
                    name: t('tables.expected'),
                    selector: (row) => row.expected,
                    cell: (row, id) =>
                      !row.response ? (
                        row.expected
                      ) : (
                        <SimpleSelect
                          className="pl-0 text-[13px] text-inherit bg-transparent border-none dark:text-inherit dark:bg-transparent dark:border-none"
                          options={[
                            { value: SUCCESS_RESPONSE_EXPECTED, label: SUCCESS_RESPONSE_EXPECTED },
                            { value: ERROR_RESPONSE_EXPECTED, label: ERROR_RESPONSE_EXPECTED },
                          ]}
                          value={row.expected}
                          onChange={(event) => {
                            const expected = event.target.value as string;

                            if (!row.response) return;

                            const { actual, status } = determineTestStatus(row.response, (response, statusCode) =>
                              determineRequestParameterTestStatus(response, statusCode, {
                                valid: expected === SUCCESS_RESPONSE_EXPECTED,
                                value: row.value,
                              }),
                            );
                            const testResult = { ...row, actual, expected, status };

                            dispatch(testsActions.updateAiTest({ id, result: testResult }));

                            if (selectedRequestId)
                              dispatch(
                                testsActions.updateAiTestResults({
                                  requestId: selectedRequestId,
                                  id,
                                  result: testResult,
                                }),
                              );
                          }}
                        />
                      ),
                  },
                  ...getTestsTableColumns(['Actual'], t),
                  {
                    name: t('tables.result'),
                    selector: (row) => row.status,
                    width: '150px',
                    cell: (row, id) => {
                      if (row.actual) return row.status;

                      return (
                        <Controls isRunning={runningAiTests[id]} executeTest={async () => await executeAiTest(id)} />
                      );
                    },
                  },
                ]}
                expandableRows
                expandableRowsComponent={ExpandedTestComponent}
                expandableRowDisabled={(row) => !row.request}
                expandOnRowClicked
                data={aiTests ?? []}
              />
            </TabPanel>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-center">
          {!showAiRequestMaskControls ? (
            <>
              <h5 className="m-0">{t('tests.aiTestingTitle')}</h5>
              <p className="m-0 text-sm">{t('tests.aiTestingDescription')}</p>
              <Button
                className="@xl:self-center"
                disabled={isRunningTests}
                onClick={() => {
                  if (!validateSerialNumber(serialNumber) || !activeAiProvider) {
                    dispatch(modalsActions.openSettingsModal(2));
                    return;
                  }

                  setShowAiRequestMaskControls(true);
                }}
              >
                {t('tests.runAiTesting')}
              </Button>
            </>
          ) : (
            <AiRequestMaskControls onCancel={() => setShowAiRequestMaskControls(false)} />
          )}
        </div>
      )}
      {aiUsage && (
        <div className="text-xs text-text-secondary @xl:text-right">
          <Trans
            i18nKey="ai.usage"
            components={{
              total: <strong className="text-text dark:text-dark-text">{aiUsage.totalTokens}</strong>,
              prompt: <strong className="text-text dark:text-dark-text">{aiUsage.promptTokens}</strong>,
              completion: <strong className="text-text dark:text-dark-text">{aiUsage.completionTokens}</strong>,
            }}
          />
        </div>
      )}
    </>
  );
}
