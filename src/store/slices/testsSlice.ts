import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AiUsage } from 'src/api/ai';
import { AiTestsOverview, HttpResponse, TestOptions, TestResult, TestResults } from 'src/types';

interface TestState extends TestResults {
  aiRunStartedAt?: number;
  compareResponse: HttpResponse | null;
  currentTest: number;
  isComparing: boolean;
  isDataDrivenRunning: boolean;
  isLargePayloadTestRunning: boolean;
  isLoadTestRunning: boolean;
  isPerformanceRunning: boolean;
  isSecurityRunning: boolean;
  loadProgress: number;
  results: Record<string, TestResults>;
  resultsToCompare: TestResults[];
  runningAiTests: {
    [id: number]: boolean;
  };
}

const initialState: TestState = {
  aiOverview: null,
  aiRunStartedAt: undefined,
  aiTests: [],
  aiUsage: null,
  compareResponse: null,
  count: 0,
  crudTests: [],
  currentTest: 0,
  dataDrivenTests: [],
  isComparing: false,
  isDataDrivenRunning: false,
  isLargePayloadTestRunning: false,
  isLoadTestRunning: false,
  isPerformanceRunning: false,
  isSecurityRunning: false,
  loadProgress: 0,
  performanceTests: [],
  results: {},
  resultsToCompare: [],
  runningAiTests: {},
  securityTests: [],
  testOptions: null,
  timestamp: null,
};

export const testsSlice = createSlice({
  name: 'tests',
  initialState,
  reducers: {
    addAiTestResults: (
      state,
      action: PayloadAction<{
        overview: AiTestsOverview | null;
        requestId: string;
        results: TestResult[];
        usage: AiUsage | null;
      }>,
    ) => {
      const results = state.results[action.payload.requestId];
      if (!results) return;

      results.aiOverview = action.payload.overview;
      results.aiTests = [...(results.aiTests || []), ...action.payload.results];
      results.aiUsage = action.payload.usage;
    },
    addResults: (state, action: PayloadAction<{ requestId: string; results: TestResults }>) => {
      state.results[action.payload.requestId] = action.payload.results;
    },
    addResultToCompare: (state, action: PayloadAction<TestResults>) => {
      state.resultsToCompare.push(action.payload);
      state.isComparing = state.resultsToCompare.length >= 2;
    },
    clearResultsToCompare: (state) => {
      state.compareResponse = null;
      state.isComparing = false;
      state.resultsToCompare = [];
    },
    incrementCurrentTest: (state) => {
      state.currentTest += 1;
    },
    resetTests: (state) => {
      state.aiRunStartedAt = undefined;
      state.aiTests = [];
      state.aiUsage = null;
      state.count = 0;
      state.crudTests = [];
      state.currentTest = 0;
      state.dataDrivenTests = [];
      state.isDataDrivenRunning = false;
      state.isLargePayloadTestRunning = false;
      state.isLoadTestRunning = false;
      state.isPerformanceRunning = false;
      state.isSecurityRunning = false;
      state.loadProgress = 0;
      state.performanceTests = [];
      state.runningAiTests = {};
      state.securityTests = [];
      state.testOptions = null;
      state.timestamp = null;
    },
    setAiRunning: (state, action: PayloadAction<boolean>) => {
      state.aiRunStartedAt = action.payload ? Date.now() : undefined;
    },
    setAiTests: (
      state,
      action: PayloadAction<{
        overview: AiTestsOverview | null;
        results: TestResult[];
        usage: AiUsage | null;
      }>,
    ) => {
      state.aiOverview = action.payload.overview;
      state.aiTests = action.payload.results;
      state.aiUsage = action.payload.usage;
    },
    setCompareResponse: (state, action: PayloadAction<HttpResponse | null>) => {
      state.compareResponse = action.payload;
    },
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
    setCrudTests: (state, action: PayloadAction<TestResult[]>) => {
      state.crudTests = action.payload;
    },
    setCurrentTest: (state, action: PayloadAction<number>) => {
      state.currentTest = action.payload;
    },
    setDataDrivenRunning: (state, action: PayloadAction<boolean>) => {
      state.isDataDrivenRunning = action.payload;
    },
    setDataDrivenTests: (state, action: PayloadAction<TestResult[]>) => {
      state.dataDrivenTests = action.payload;
    },
    setLargePayloadTestRunning: (state, action: PayloadAction<boolean>) => {
      state.isLargePayloadTestRunning = action.payload;
    },
    setLoadProgress: (state, action: PayloadAction<number>) => {
      state.loadProgress = action.payload;
    },
    setLoadTestRunning: (state, action: PayloadAction<boolean>) => {
      state.isLoadTestRunning = action.payload;
    },
    setOptions: (state, action: PayloadAction<TestOptions | null>) => {
      state.testOptions = action.payload;
    },
    setPerformanceRunning: (state, action: PayloadAction<boolean>) => {
      state.isPerformanceRunning = action.payload;
    },
    setPerformanceTests: (state, action: PayloadAction<TestResult[]>) => {
      state.performanceTests = action.payload;
    },
    setRunningAiTest: (state, action: PayloadAction<{ id: number; isRunning: boolean }>) => {
      if (!action.payload.isRunning) delete state.runningAiTests[action.payload.id];
      else state.runningAiTests[action.payload.id] = action.payload.isRunning;
    },
    setSecurityRunning: (state, action: PayloadAction<boolean>) => {
      state.isSecurityRunning = action.payload;
    },
    setSecurityTests: (state, action: PayloadAction<TestResult[]>) => {
      state.securityTests = action.payload;
    },
    setTimestamp: (state, action: PayloadAction<number | null>) => {
      state.timestamp = action.payload;
    },
    startAllTests: (state) => {
      state.count = 0;
      state.crudTests = [];
      state.currentTest = 0;
      state.dataDrivenTests = [];
      state.isDataDrivenRunning = true;
      state.isPerformanceRunning = true;
      state.isSecurityRunning = true;
      state.performanceTests = [];
      state.securityTests = [];
      state.timestamp = null;
    },
    updateAiTest: (state, action: PayloadAction<{ id: number; result: TestResult }>) => {
      if (!state.aiTests || !state.aiTests[action.payload.id]) return;

      state.aiTests[action.payload.id] = action.payload.result;
    },
    updateAiTestResults: (state, action: PayloadAction<{ id: number; requestId: string; result: TestResult }>) => {
      const results = state.results[action.payload.requestId];
      if (!results || !results.aiTests || !results.aiTests[action.payload.id]) return;

      results.aiTests[action.payload.id] = action.payload.result;
    },
    updateDataDrivenTest: (state, action: PayloadAction<TestResult>) => {
      const index = state.dataDrivenTests.findIndex(
        (test) => test.name === action.payload.name && test.value === action.payload.value,
      );
      if (index !== -1) state.dataDrivenTests[index] = action.payload;
    },
    updateDataDrivenTestResults: (state, action: PayloadAction<{ requestId: string; result: TestResult }>) => {
      const results = state.results[action.payload.requestId];
      if (!results) return;

      const index = results.dataDrivenTests.findIndex(
        (test) => test.name === action.payload.result.name && test.value === action.payload.result.value,
      );
      if (index !== -1) results.dataDrivenTests[index] = action.payload.result;
    },
    updatePerformanceTest: (state, action: PayloadAction<{ result: TestResult; testName: string }>) => {
      const index = state.performanceTests.findIndex((t) => t.name === action.payload.testName);
      if (index !== -1) state.performanceTests[index] = action.payload.result;
    },
    updatePerformanceTestResults: (
      state,
      action: PayloadAction<{ requestId: string; result: TestResult; testName: string }>,
    ) => {
      const results = state.results[action.payload.requestId];
      if (!results) return;

      const index = results.performanceTests.findIndex((test) => test.name === action.payload.testName);
      if (index !== -1) results.performanceTests[index] = action.payload.result;
    },
    updateSecurityTest: (state, action: PayloadAction<{ result: TestResult; testName: string }>) => {
      const index = state.securityTests.findIndex((t) => t.name === action.payload.testName);
      if (index !== -1) state.securityTests[index] = action.payload.result;
    },
    updateSecurityTestResults: (
      state,
      action: PayloadAction<{ requestId: string; result: TestResult; testName: string }>,
    ) => {
      const results = state.results[action.payload.requestId];
      if (!results) return;

      const index = results.securityTests.findIndex((test) => test.name === action.payload.testName);
      if (index !== -1) results.securityTests[index] = action.payload.result;
    },
  },
});

export const testsActions = testsSlice.actions;
export default testsSlice.reducer;
