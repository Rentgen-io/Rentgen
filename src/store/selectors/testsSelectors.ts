import { createSelector } from '@reduxjs/toolkit';
import { TestsTabId } from 'src/constants/testsTabs';
import { RootState } from 'src/store';
import { getTestsStatistics } from 'src/test-engine/BaseTests';
import { TestResults } from 'src/types';
import { selectDisabledPerformanceInsights, selectDisabledSecurityTests } from './settingsSelectors';

export type TestsStatistics = ReturnType<typeof getTestsStatistics>;

export const selectAiOverview = (state: RootState) => state.tests.aiOverview;
export const selectAiRunStartedAt = (state: RootState) => state.tests.aiRunStartedAt;
export const selectAiTests = (state: RootState) => state.tests.aiTests;
export const selectAiUsage = (state: RootState) => state.tests.aiUsage;
export const selectAllTestResults = (state: RootState) => state.tests.results;
export const selectCompareResponse = (state: RootState) => state.tests.compareResponse;
export const selectCrudTests = (state: RootState) => state.tests.crudTests;
export const selectCurrentTest = (state: RootState) => state.tests.currentTest;
export const selectDataDrivenTests = (state: RootState) => state.tests.dataDrivenTests;
export const selectHasTestResultsToCompare = (state: RootState) => state.tests.resultsToCompare.length > 0;
export const selectIsAiTestsRunning = (state: RootState) => state.tests.isAiTestsRunning;
export const selectIsComparingTestResults = (state: RootState) => state.tests.isComparing;
export const selectIsDataDrivenRunning = (state: RootState) => state.tests.isDataDrivenRunning;
export const selectIsGeneratingAiTests = (state: RootState) => Boolean(state.tests.aiRunStartedAt);
export const selectIsLargePayloadTestRunning = (state: RootState) => state.tests.isLargePayloadTestRunning;
export const selectIsLoadTestRunning = (state: RootState) => state.tests.isLoadTestRunning;
export const selectIsPerformanceRunning = (state: RootState) => state.tests.isPerformanceRunning;
export const selectIsSecurityRunning = (state: RootState) => state.tests.isSecurityRunning;
export const selectPerformanceTests = (state: RootState) => state.tests.performanceTests;
export const selectRunningAiTests = (state: RootState) => state.tests.runningAiTests;
export const selectSecurityTests = (state: RootState) => state.tests.securityTests;
export const selectTestOptions = (state: RootState) => state.tests.testOptions;
export const selectTestResultsToCompare = (state: RootState) => state.tests.resultsToCompare;
export const selectTestsCount = (state: RootState) => state.tests.count;
export const selectTestsTimestamp = (state: RootState) => state.tests.timestamp;

export const selectCurrentTestResults: (state: RootState) => TestResults | null = createSelector(
  [
    selectAiOverview,
    selectAiTests,
    selectAiUsage,
    selectCrudTests,
    selectDataDrivenTests,
    selectPerformanceTests,
    selectSecurityTests,
    selectTestOptions,
    selectTestsCount,
    selectTestsTimestamp,
  ],
  (
    aiOverview,
    aiTests,
    aiUsage,
    crudTests,
    dataDrivenTests,
    performanceTests,
    securityTests,
    testOptions,
    count,
    timestamp,
  ) => {
    if (!count || !testOptions) return null;

    return {
      aiOverview,
      aiTests,
      aiUsage,
      count,
      crudTests,
      dataDrivenTests,
      performanceTests,
      securityTests,
      testOptions,
      timestamp,
    };
  },
);
export const selectIsRunningTests = createSelector(
  [selectIsSecurityRunning, selectIsPerformanceRunning, selectIsDataDrivenRunning],
  (isSecurityRunning, isPerformanceRunning, isDataDrivenRunning) =>
    isSecurityRunning || isPerformanceRunning || isDataDrivenRunning,
);
export const selectRequestTestResults = (requestId: string) =>
  createSelector([selectAllTestResults], (results) => results[requestId] || null);
export const selectHasTestResults = (state: RootState) => selectCurrentTestResults(state) !== null;
export const selectIsAiBusy = (state: RootState) => state.tests.isAiTestsRunning || selectIsGeneratingAiTests(state);
export const selectIsRunningAiTests = (state: RootState) =>
  state.tests.isAiTestsRunning || Object.keys(state.tests.runningAiTests).length > 0;
export const selectIsRunningAnyTests = (state: RootState) =>
  selectIsRunningTests(state) || selectIsAiBusy(state) || selectIsRunningAiTests(state);
export const selectTestsStatistics: (state: RootState) => Record<TestsTabId, TestsStatistics> = createSelector(
  [
    selectAiTests,
    selectSecurityTests,
    selectPerformanceTests,
    selectDataDrivenTests,
    selectCrudTests,
    selectDisabledSecurityTests,
    selectDisabledPerformanceInsights,
  ],
  (
    aiTests,
    securityTests,
    performanceTests,
    dataDrivenTests,
    crudTests,
    disabledSecurityTests,
    disabledPerformanceInsights,
  ) => ({
    ai: getTestsStatistics(aiTests ?? []),
    security: getTestsStatistics(securityTests, disabledSecurityTests),
    performance: getTestsStatistics(performanceTests, disabledPerformanceInsights),
    dataDriven: getTestsStatistics(dataDrivenTests),
    crud: getTestsStatistics(crudTests),
  }),
);
export const selectTestsTabsRunning: (state: RootState) => Record<TestsTabId, boolean> = createSelector(
  [selectIsGeneratingAiTests, selectIsSecurityRunning, selectIsPerformanceRunning, selectIsDataDrivenRunning],
  (isGeneratingAiTests, isSecurityRunning, isPerformanceRunning, isDataDrivenRunning) => ({
    ai: isGeneratingAiTests,
    security: isSecurityRunning,
    performance: isPerformanceRunning,
    dataDriven: isDataDrivenRunning,
    crud: isSecurityRunning,
  }),
);
