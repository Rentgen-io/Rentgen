import { LARGE_PAYLOAD_TEST_NAME, LOAD_TEST_NAME, OPTIONS_METHOD_HANDLING_TEST_NAME } from 'shared/testNames';
import { getDatasets } from 'src/constants/datasets';
import { store } from 'src/store';
import {
  selectActiveAiProvider,
  selectAiOverview,
  selectAiTests,
  selectAiUsage,
  selectCrudTests,
  selectDataDrivenTests,
  selectDisabledPerformanceInsights,
  selectDisabledSecurityTests,
  selectPerformanceTests,
  selectSecurityTests,
  selectSelectedRequestId,
  selectTestEngineConfiguration,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  AiTests,
  cancelAllAiTests,
  cancelLargePayloadTest,
  cancelLoadTest,
  DataDrivenTests,
  generateDynamicTestData,
  LOAD_TEST_EXPECTED,
  PerformanceInsights,
  runAiTest,
  runDataDrivenTests,
  runLargePayloadTest,
  runLoadTest,
  SecurityTests,
} from 'src/test-engine';
import { getTestCount } from 'src/test-engine/decorators';
import { ParameterValue, TestOptions, TestResult } from 'src/types';

/*
 * Drives test runs through the store. Not a hook: every action reads what it needs from the store once, when it starts,
 * so components only subscribe to what they render. Reading at start also keeps a run tied to the request it was
 * started for: its results are saved there even if the user selects another request meanwhile.
 */

const { dispatch } = store;

let abortAiTests = false;
let abortAllTests = false;
let aiTestsInstance: AiTests | null = null;
let dataDrivenTestsInstance: DataDrivenTests | null = null;
let performanceInsightsInstance: PerformanceInsights | null = null;
let securityTestsInstance: SecurityTests | null = null;

const incrementCurrentTest = () => {
  dispatch(testsActions.incrementCurrentTest());
};

/** Stops every running test, without touching the store. */
export function abortAllTestRuns() {
  abortAiTests = true;
  abortAllTests = true;

  aiTestsInstance?.abort();
  dataDrivenTestsInstance?.abort();
  performanceInsightsInstance?.abort();
  securityTestsInstance?.abort();

  cancelAllAiTests();
  cancelLargePayloadTest();
  cancelLoadTest();
}

// --- Full run (security, data-driven, performance) ---

async function calculateDataDrivenTestsCount(options: TestOptions, emailDomain: string): Promise<number> {
  let dataDrivenTestsCount = 0;
  const datasets = getDatasets(emailDomain);
  const countValues = async (_: unknown, value: ParameterValue) => {
    dataDrivenTestsCount += [...generateDynamicTestData(value), ...(datasets[value.type] || [])].length;
  };

  await runDataDrivenTests(
    options,
    async () => {
      dataDrivenTestsCount += 1;
    },
    countValues,
    countValues,
  );

  return dataDrivenTestsCount;
}

async function executeSecurityTests(
  options: TestOptions,
  disabledSecurityTests: string[],
): Promise<{ crudTests: TestResult[]; securityTests: TestResult[] }> {
  dispatch(testsActions.setSecurityRunning(true));
  dispatch(testsActions.setSecurityTests([]));
  dispatch(testsActions.setCrudTests([]));

  securityTestsInstance = new SecurityTests(options, disabledSecurityTests, incrementCurrentTest);
  const { crudTests, securityTests } = await securityTestsInstance.run();

  dispatch(testsActions.setCrudTests(crudTests));
  dispatch(testsActions.setSecurityTests(securityTests));
  dispatch(testsActions.setSecurityRunning(false));

  return { crudTests, securityTests };
}

async function executeDataDrivenTests(options: TestOptions): Promise<TestResult[]> {
  dispatch(testsActions.setDataDrivenRunning(true));
  dispatch(testsActions.setDataDrivenTests([]));

  dataDrivenTestsInstance = new DataDrivenTests(options, incrementCurrentTest);
  const dataDrivenTestResults = await dataDrivenTestsInstance.run();

  dispatch(testsActions.setDataDrivenTests(dataDrivenTestResults));
  dispatch(testsActions.setDataDrivenRunning(false));

  return dataDrivenTestResults;
}

async function executePerformanceTests(
  options: TestOptions,
  testResults: TestResult[],
  disabledPerformanceInsights: string[],
): Promise<TestResult[]> {
  dispatch(testsActions.setPerformanceRunning(true));
  dispatch(testsActions.setPerformanceTests([]));

  performanceInsightsInstance = new PerformanceInsights(
    testResults,
    options,
    disabledPerformanceInsights,
    incrementCurrentTest,
  );
  const performanceTestResults = await performanceInsightsInstance.run();

  dispatch(testsActions.setPerformanceTests(performanceTestResults));
  dispatch(testsActions.setPerformanceRunning(false));

  return performanceTestResults;
}

export function cancelAllTests() {
  abortAllTestRuns();

  dispatch(testsActions.cancelAllTests());
}

export async function executeAllTests(options: TestOptions) {
  const state = store.getState();
  const aiOverview = selectAiOverview(state);
  const aiTests = selectAiTests(state);
  const aiUsage = selectAiUsage(state);
  const disabledPerformanceInsights = selectDisabledPerformanceInsights(state);
  const disabledSecurityTests = selectDisabledSecurityTests(state);
  const emailDomain = selectTestEngineConfiguration(state).email.domain;
  const selectedRequestId = selectSelectedRequestId(state);

  abortAllTests = false;

  dispatch(testsActions.setOptions(options));
  dispatch(testsActions.startAllTests());

  const count =
    (await calculateDataDrivenTestsCount(options, emailDomain)) +
    getTestCount(DataDrivenTests) +
    getTestCount(SecurityTests) +
    getTestCount(PerformanceInsights) -
    disabledSecurityTests.length +
    (disabledSecurityTests.includes(OPTIONS_METHOD_HANDLING_TEST_NAME) ? -1 : 0) -
    disabledPerformanceInsights.length;
  const timestamp = new Date().getTime();

  dispatch(testsActions.setCount(count));
  dispatch(testsActions.setTimestamp(timestamp));

  const { crudTests, securityTests } = !abortAllTests
    ? await executeSecurityTests(options, disabledSecurityTests)
    : { crudTests: [], securityTests: [] };
  const dataDrivenTests = !abortAllTests ? await executeDataDrivenTests(options) : [];
  const performanceTests = !abortAllTests
    ? await executePerformanceTests(options, dataDrivenTests, disabledPerformanceInsights)
    : [];

  if (selectedRequestId)
    dispatch(
      testsActions.addResults({
        requestId: selectedRequestId,
        results: {
          aiOverview,
          aiTests,
          aiUsage,
          crudTests,
          count,
          dataDrivenTests,
          performanceTests,
          securityTests,
          testOptions: options,
          timestamp,
        },
      }),
    );
}

// --- AI tests ---

export function cancelAiTestsGeneration() {
  aiTestsInstance?.abort();
}

export async function executeAiTestsGeneration(options: TestOptions | null, maskedFields: string[]) {
  const state = store.getState();
  const activeAiProvider = selectActiveAiProvider(state);
  const selectedRequestId = selectSelectedRequestId(state);

  if (!options || !activeAiProvider) return;

  dispatch(testsActions.setAiRunning(true));

  aiTestsInstance = new AiTests(activeAiProvider, maskedFields, options, {
    crudTests: selectCrudTests(state),
    dataDrivenTests: selectDataDrivenTests(state),
    performanceTests: selectPerformanceTests(state),
    securityTests: selectSecurityTests(state),
  });
  const results = await aiTestsInstance.run();

  dispatch(testsActions.setAiRunning(false));

  if (!results) return;

  dispatch(testsActions.setAiTests(results));

  if (selectedRequestId) dispatch(testsActions.addAiTestResults({ requestId: selectedRequestId, ...results }));
}

async function executeAiTestFor(name: string, aiTests: TestResult[] | null, requestId: string | null) {
  const aiTest = aiTests?.find((test) => test.name === name);
  if (!aiTest) return;

  dispatch(testsActions.setRunningAiTest({ name, isRunning: true }));

  const result = await runAiTest(aiTest);

  dispatch(testsActions.setRunningAiTest({ name, isRunning: false }));
  dispatch(testsActions.updateAiTest({ name, result }));

  if (requestId) dispatch(testsActions.updateAiTestResults({ name, requestId, result }));
}

export async function executeAiTest(name: string) {
  const state = store.getState();

  await executeAiTestFor(name, selectAiTests(state), selectSelectedRequestId(state));
}

export async function executeAllAiTests() {
  const state = store.getState();
  const aiTests = selectAiTests(state);
  const selectedRequestId = selectSelectedRequestId(state);

  abortAiTests = false;

  dispatch(testsActions.setAiTestsRunning(true));

  for (const aiTest of aiTests ?? []) {
    if (abortAiTests) break;
    await executeAiTestFor(aiTest.name, aiTests, selectedRequestId);
  }

  dispatch(testsActions.setAiTestsRunning(false));
}

// --- Single heavy tests ---

export async function executeLargePayloadTest(options: TestOptions, size: number) {
  const selectedRequestId = selectSelectedRequestId(store.getState());

  dispatch(testsActions.setLargePayloadTestRunning(true));

  const result = await runLargePayloadTest(options, size);

  dispatch(testsActions.updateSecurityTest({ name: LARGE_PAYLOAD_TEST_NAME, result }));
  dispatch(testsActions.setLargePayloadTestRunning(false));

  if (selectedRequestId)
    dispatch(
      testsActions.updateSecurityTestResults({ name: LARGE_PAYLOAD_TEST_NAME, requestId: selectedRequestId, result }),
    );
}

const LOAD_BAR_WIDTH = 20;

function formatLoadTestProgress(percent: number, sentRequestCount: number, requestCount: number): string {
  const filled = Math.round((percent / 100) * LOAD_BAR_WIDTH);
  const loadBar = '▓'.repeat(filled) + '░'.repeat(LOAD_BAR_WIDTH - filled) + ` ${percent}%`;

  return `${loadBar} (${sentRequestCount}/${requestCount})`;
}

export async function executeLoadTest(options: TestOptions, threadCount: number, requestCount: number) {
  const state = store.getState();
  const selectedRequestId = selectSelectedRequestId(state);
  // While running, the row keeps the status of the previous load test result
  const previousStatus = selectPerformanceTests(state).find((test) => test.name === LOAD_TEST_NAME)?.status || 'info';

  const updateProgress = (percent: number, sentRequestCount: number, totalRequestCount: number) => {
    dispatch(testsActions.setLoadProgress(percent));
    dispatch(
      testsActions.updatePerformanceTest({
        name: LOAD_TEST_NAME,
        result: {
          actual: formatLoadTestProgress(percent, sentRequestCount, totalRequestCount),
          expected: LOAD_TEST_EXPECTED,
          name: LOAD_TEST_NAME,
          status: previousStatus,
        } as TestResult,
      }),
    );
  };

  dispatch(testsActions.setLoadTestRunning(true));
  updateProgress(0, 0, requestCount);

  let lastPercent = 0;
  const result = await runLoadTest(options, threadCount, requestCount, (sentRequestCount, totalRequestCount) => {
    const percent = Math.floor((sentRequestCount / totalRequestCount) * 100);
    if (percent === lastPercent) return;

    lastPercent = percent;
    updateProgress(percent, sentRequestCount, totalRequestCount);
  });

  dispatch(testsActions.updatePerformanceTest({ name: LOAD_TEST_NAME, result }));
  dispatch(testsActions.setLoadTestRunning(false));

  if (selectedRequestId)
    dispatch(testsActions.updatePerformanceTestResults({ name: LOAD_TEST_NAME, requestId: selectedRequestId, result }));
}
