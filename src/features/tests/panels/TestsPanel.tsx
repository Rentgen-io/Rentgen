import cn from 'classnames';
import { ComponentType, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import Loader from 'src/components/loaders/Loader';
import { TESTS_TABS, TestsTab } from 'src/constants/tests-tabs';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectTestsActiveTab, selectTestsStatistics, selectTestsTabsRunning } from 'src/store/selectors';
import { uiActions } from 'src/store/slices/uiSlice';
import { twMerge } from 'tailwind-merge';
import TestResultsSummary from '../TestResultsSummary';
import AiTestingPanel from './AiTestingPanel';
import CrudTestsPanel from './CrudTestsPanel';
import DataDrivenTestsPanel from './DataDrivenTestsPanel';
import PerformanceInsightsPanel from './PerformanceInsightsPanel';
import SecurityTestsPanel from './SecurityTestsPanel';

/*
 * All panels stay mounted (forceRenderTabPanel). They take no props and select their own data, so memo keeps this
 * component's re-renders (statistics / running flags changing) from re-rendering their tables.
 */
const PANELS: Record<TestsTab, ComponentType> = {
  ai: memo(AiTestingPanel),
  security: memo(SecurityTestsPanel),
  performance: memo(PerformanceInsightsPanel),
  dataDriven: memo(DataDrivenTestsPanel),
  crud: memo(CrudTestsPanel),
};

export default function TestsPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isRunning = useAppSelector(selectTestsTabsRunning);
  const statistics = useAppSelector(selectTestsStatistics);
  const testsActiveTab = useAppSelector(selectTestsActiveTab);

  const testsTabsRef = useRef<HTMLUListElement | null>(null);

  return (
    <div className="flex flex-col flex-auto gap-4">
      <TestResultsSummary
        onSelectTab={(id) => {
          dispatch(uiActions.setTestsActiveTab(id));
          testsTabsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      <Tabs
        className="flex flex-col flex-auto"
        forceRenderTabPanel
        selectedIndex={TESTS_TABS.findIndex(({ tab }) => tab === testsActiveTab)}
        selectedTabClassName="text-foreground border-primary! cursor-default!"
        selectedTabPanelClassName="flex! flex-col flex-auto gap-4"
        onSelect={(index) => {
          dispatch(uiActions.setTestsActiveTab(TESTS_TABS[index].tab));
        }}
      >
        <TabList
          className="flex gap-6 m-0 pt-3 pb-0 px-4 text-xs font-medium text-muted-foreground border-b border-border"
          ref={testsTabsRef}
        >
          {TESTS_TABS.map(({ labelKey, tab }) => {
            const { bugs, failed, passed, warnings } = statistics[tab];
            const issueCount = bugs + failed + warnings;
            const label = t(labelKey);

            return (
              <Tab
                className="relative flex items-center gap-2 pb-2.5 border-b-2 border-transparent list-none outline-none truncate cursor-pointer"
                key={tab}
                title={label}
              >
                {isRunning[tab] ? (
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
                {issueCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-4 py-px px-1 text-[10px] bg-accent-soft rounded">
                    {issueCount}
                  </span>
                )}
              </Tab>
            );
          })}
        </TabList>
        {TESTS_TABS.map(({ tab }) => {
          const Panel = PANELS[tab];

          return (
            <TabPanel className="hidden min-h-51.5 py-3 px-4" key={tab}>
              <Panel />
            </TabPanel>
          );
        })}
      </Tabs>
    </div>
  );
}
