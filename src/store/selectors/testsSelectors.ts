import { createSelector } from '@reduxjs/toolkit';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { RootState } from 'src/store';
import { selectHttpResponse, selectStatusCode } from './responseSelectors';

export const selectTestOptions = (state: RootState) => state.tests.testOptions;
export const selectCrudTests = (state: RootState) => state.tests.crudTests;
export const selectDataDrivenTests = (state: RootState) => state.tests.dataDrivenTests;
export const selectPerformanceTests = (state: RootState) => state.tests.performanceTests;
export const selectSecurityTests = (state: RootState) => state.tests.securityTests;
export const selectCurrentTest = (state: RootState) => state.tests.currentTest;
export const selectTestsCount = (state: RootState) => state.tests.count;
export const selectTestsTimestamp = (state: RootState) => state.tests.timestamp;

export const selectIsSecurityRunning = (state: RootState) => state.tests.isSecurityRunning;
export const selectIsPerformanceRunning = (state: RootState) => state.tests.isPerformanceRunning;
export const selectIsDataDrivenRunning = (state: RootState) => state.tests.isDataDrivenRunning;
export const selectIsLoadTestRunning = (state: RootState) => state.tests.isLoadTestRunning;
export const selectIsLargePayloadTestRunning = (state: RootState) => state.tests.isLargePayloadTestRunning;
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

export const selectAllTestResults = (state: RootState) => state.tests.results;
export const selectRequestTestResults = (requestId: string) =>
  createSelector([selectAllTestResults], (results) => results[requestId] || null);
export const selectCurrentTestResults = createSelector(
  [
    selectTestsCount,
    selectTestsTimestamp,
    selectCrudTests,
    selectDataDrivenTests,
    selectPerformanceTests,
    selectSecurityTests,
    selectTestOptions,
  ],
  (count, timestamp, crudTests, dataDrivenTests, performanceTests, securityTests, testOptions) => {
    if (!count || !testOptions) return null;

    return { count, timestamp, crudTests, dataDrivenTests, performanceTests, securityTests, testOptions };
  },
);

export const selectCompareResponse = (state: RootState) => state.tests.compareResponse;
export const selectIsComparingTestResults = (state: RootState) => state.tests.isComparing;
export const selectTestResultsToCompare = (state: RootState) => state.tests.resultsToCompare;
