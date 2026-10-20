import { createSelector } from '@reduxjs/toolkit';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { RootState } from 'src/store';
import { TestResults } from 'src/types';
import { selectHttpResponse, selectStatusCode } from './responseSelectors';

export const selectAiOverview = (state: RootState) => state.tests.aiOverview;
export const selectAiRunStartedAt = (state: RootState) => state.tests.aiRunStartedAt;
export const selectAiTests = (state: RootState) => state.tests.aiTests;
export const selectAiUsage = (state: RootState) => state.tests.aiUsage;
export const selectAllTestResults = (state: RootState) => state.tests.results;
export const selectCompareResponse = (state: RootState) => state.tests.compareResponse;
export const selectCrudTests = (state: RootState) => state.tests.crudTests;
export const selectCurrentTest = (state: RootState) => state.tests.currentTest;
export const selectDataDrivenTests = (state: RootState) => state.tests.dataDrivenTests;
export const selectIsComparingTestResults = (state: RootState) => state.tests.isComparing;
export const selectIsDataDrivenRunning = (state: RootState) => state.tests.isDataDrivenRunning;
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
  (aiTests, aiUsage, crudTests, dataDrivenTests, performanceTests, securityTests, testOptions, count, timestamp) => {
    if (!count || !testOptions) return null;

    return {
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
export const selectDisabledRunTests = createSelector(
  [selectIsRunningTests, selectHttpResponse, selectStatusCode],
  (isRunning, response, statusCode) =>
    isRunning || !response || statusCode < RESPONSE_STATUS.OK || statusCode >= RESPONSE_STATUS.BAD_REQUEST,
);
export const selectRequestTestResults = (requestId: string) =>
  createSelector([selectAllTestResults], (results) => results[requestId] || null);
