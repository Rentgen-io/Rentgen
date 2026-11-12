import cn from 'classnames';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Loader from 'src/components/loaders/Loader';
import useTests from 'src/hooks/useTests';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectDisabledPerformanceInsights,
  selectDisabledSecurityTests,
  selectTestsActiveTab,
} from 'src/store/selectors';
import { uiActions } from 'src/store/slices/uiSlice';
import { getTestsStatistics } from 'src/test-engine';
import { twMerge } from 'tailwind-merge';
import TestResultsSummary from '../TestResultsSummary';
import AiTestingPanel from './AiTestingPanel';
import CrudTestsPanel from './CrudTestsPanel';
import DataDrivenTestsPanel from './DataDrivenTestsPanel';
import PerformanceInsightsPanel from './PerformanceInsightsPanel';
import SecurityTestsPanel from './SecurityTestsPanel';

export default function TestsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const {
    aiRunStartedAt,
    aiTests,
    crudTests,
    dataDrivenTests,
    isDataDrivenRunning,
    isPerformanceRunning,
    isSecurityRunning,
    performanceTests,
    securityTests,
  } = useTests();

  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const testsActiveTab = useAppSelector(selectTestsActiveTab);

  const testsTabsRef = useRef<HTMLUListElement | null>(null);

  const testsTabs = useMemo(
    () => [
      {
        component: <AiTestingPanel />,
        isRunning: Boolean(aiRunStartedAt),
        label: t('tests.aiTesting'),
        tests: aiTests,
      },
      {
        component: <SecurityTestsPanel />,
        disabledTests: disabledSecurityTests,
        isRunning: isSecurityRunning,
        label: t('tests.securityTests'),
        tests: securityTests,
      },
      {
        component: <PerformanceInsightsPanel />,
        disabledTests: disabledPerformanceInsights,
        isRunning: isPerformanceRunning,
        label: t('tests.performanceInsights'),
        tests: performanceTests,
      },
      {
        component: <DataDrivenTestsPanel />,
        isRunning: isDataDrivenRunning,
        label: t('tests.dataDrivenTests'),
        tests: dataDrivenTests,
      },
      {
        component: <CrudTestsPanel />,
        isRunning: isSecurityRunning,
        label: t('tests.crud'),
        tests: crudTests,
      },
    ],
    [
      aiRunStartedAt,
      aiTests,
      crudTests,
      dataDrivenTests,
      disabledSecurityTests,
      isDataDrivenRunning,
      isPerformanceRunning,
      isSecurityRunning,
      performanceTests,
      securityTests,
      t,
    ],
  );

  const statistics = useMemo(
    () =>
      Object.fromEntries(
        testsTabs.map(({ label, disabledTests, tests }) => [label, getTestsStatistics(tests ?? [], disabledTests)]),
      ),
    [testsTabs],
  );

  return (
    <div className="flex flex-col flex-auto gap-4">
      <TestResultsSummary
        statistics={statistics}
        onClick={(index) => {
          dispatch(uiActions.setTestsActiveTab(index));
          testsTabsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      <Tabs
        className="flex flex-col flex-auto"
        forceRenderTabPanel
        selectedIndex={testsActiveTab}
        selectedTabClassName="text-foreground border-primary! cursor-default!"
        selectedTabPanelClassName="flex! flex-col flex-auto gap-4"
        onSelect={(index) => {
          dispatch(uiActions.setTestsActiveTab(index));
        }}
      >
        <TabList
          ref={testsTabsRef}
          className="flex gap-6 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border"
        >
          {testsTabs.map(({ isRunning, label }) => {
            const { bugs, failed, passed, warnings } = statistics[label];

            return (
              <Tab
                key={label}
                className="relative flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none truncate cursor-pointer"
                title={label}
              >
                {isRunning ? (
                  <Loader className="size-4 shrink-0 [&>span]:border-2!" />
                ) : (
                  <span
                    className={twMerge(
                      cn('w-2 h-2 rounded-full shrink-0 bg-gray-400', {
                        'bg-metric-pass': passed > 0 && failed === 0 && warnings === 0 && bugs === 0,
                        'bg-metric-warning': warnings > 0 && failed === 0 && bugs === 0,
                        'bg-metric-fail': failed > 0 && bugs === 0,
                        'bg-metric-bug': bugs > 0,
                      }),
                    )}
                  />
                )}

                <span className="truncate">{label}</span>
                {bugs + failed + warnings > 0 && (
                  <span className="inline-flex items-center justify-center min-w-4 py-px px-1 text-[10px] bg-accent-soft rounded">
                    {bugs + failed + warnings}
                  </span>
                )}
              </Tab>
            );
          })}
        </TabList>
        {testsTabs.map(({ component, label }) => (
          <TabPanel key={label} className="hidden min-h-51.5 py-3 px-4">
            {component}
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
