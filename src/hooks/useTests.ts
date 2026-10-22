import { useCallback, useMemo } from 'react';
import { LARGE_PAYLOAD_TEST_NAME, LOAD_TEST_NAME, OPTIONS_METHOD_HANDLING_TEST_NAME } from 'shared/testNames';
import { getDatasets } from 'src/constants/datasets';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectActiveAiProvider,
  selectAiOverview,
  selectAiRunStartedAt,
  selectAiTests,
  selectAiUsage,
  selectCrudTests,
  selectCurrentTest,
  selectDataDrivenTests,
  selectDisabledPerformanceInsights,
  selectDisabledSecurityTests,
  selectIsAiTestsRunning,
  selectIsDataDrivenRunning,
  selectIsLargePayloadTestRunning,
  selectIsLoadTestRunning,
  selectIsPerformanceRunning,
  selectIsRunningTests,
  selectIsSecurityRunning,
  selectPerformanceTests,
  selectRunningAiTests,
  selectSecurityTests,
  selectSelectedRequestId,
  selectTestEngineConfiguration,
  selectTestsCount,
  selectTestsTimestamp,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  cancelLargePayloadTest,
  cancelLoadTest,
  DataDrivenTests,
  generateDynamicTestData,
  LOAD_TEST_EXPECTED,
  PerformanceInsights,
  runDataDrivenTests,
  runLargePayloadTest,
  runLoadTest,
  SecurityTests,
} from 'src/test-engine';
import { AiTests, cancelAllAiTests, runAiTest } from 'src/test-engine/AiTests';
import { getTestCount } from 'src/test-engine/decorators';
import { ParameterValue, TestOptions, TestResult, TestStatus } from 'src/types';

let abortAiTests = false;
let abortAllTests = false;
let aiTestsInstance: AiTests | null = null;
let dataDrivenTestsInstance: DataDrivenTests | null = null;
let performanceInsightsInstance: PerformanceInsights | null = null;
let securityTestsInstance: SecurityTests | null = null;

const useTests = () => {
  const dispatch = useAppDispatch();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const aiOverview = useAppSelector(selectAiOverview);
  const aiRunStartedAt = useAppSelector(selectAiRunStartedAt);
  const aiTests = useAppSelector(selectAiTests);
  const aiUsage = useAppSelector(selectAiUsage);
  const crudTests = useAppSelector(selectCrudTests);
  const currentTest = useAppSelector(selectCurrentTest);
  const dataDrivenTests = useAppSelector(selectDataDrivenTests);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const isAiTestsRunning = useAppSelector(selectIsAiTestsRunning);
  const isDataDrivenRunning = useAppSelector(selectIsDataDrivenRunning);
  const isLargePayloadTestRunning = useAppSelector(selectIsLargePayloadTestRunning);
  const isLoadTestRunning = useAppSelector(selectIsLoadTestRunning);
  const isPerformanceRunning = useAppSelector(selectIsPerformanceRunning);
  const isRunningTests = useAppSelector(selectIsRunningTests);
  const isSecurityRunning = useAppSelector(selectIsSecurityRunning);
  const performanceTests = useAppSelector(selectPerformanceTests);
  const runningAiTests = useAppSelector(selectRunningAiTests);
  const securityTests = useAppSelector(selectSecurityTests);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const testEngineConfiguration = useAppSelector(selectTestEngineConfiguration);
  const testsCount = useAppSelector(selectTestsCount);
  const testsTimestamp = useAppSelector(selectTestsTimestamp);

  const emailConfiguration = testEngineConfiguration.email;

  const pendingAiTests = useMemo(
    () => aiTests?.filter((test) => !test.actual || test.status === TestStatus.Manual) ?? [],
    [aiTests],
  );

  const incrementCurrentTest = useCallback(() => {
    dispatch(testsActions.incrementCurrentTest());
  }, [dispatch]);

  const calculateDataDrivenTestsCount = useCallback(
    async (options: TestOptions): Promise<number> => {
      let dataDrivenTestsCount = 0;
      const datasets = getDatasets(emailConfiguration.domain);

      await runDataDrivenTests(
        options,
        async () => {
          dataDrivenTestsCount += 1;
        },
        async (_, value: ParameterValue) => {
          dataDrivenTestsCount += [...generateDynamicTestData(value), ...(datasets[value.type] || [])].length;
        },
        async (_, value: ParameterValue) => {
          dataDrivenTestsCount += [...generateDynamicTestData(value), ...(datasets[value.type] || [])].length;
        },
      );

      return dataDrivenTestsCount;
    },
    [emailConfiguration.domain],
  );

  const cancelAiTestsGeneration = useCallback(() => {
    aiTestsInstance?.abort();
  }, []);

  const cancelAllTests = useCallback(() => {
    abortAiTests = true;
    abortAllTests = true;

    aiTestsInstance?.abort();
    dataDrivenTestsInstance?.abort();
    performanceInsightsInstance?.abort();
    securityTestsInstance?.abort();

    cancelAllAiTests();
    cancelLargePayloadTest();
    cancelLoadTest();

    dispatch(testsActions.resetTests());
  }, [dispatch]);

  const executeAiTest = useCallback(
    async (name: string) => {
      const aiTest = aiTests?.find((test) => test.name === name);
      if (!aiTest) return;

      dispatch(testsActions.setRunningAiTest({ name, isRunning: true }));

      const result = await runAiTest(aiTest);

      dispatch(testsActions.setRunningAiTest({ name, isRunning: false }));
      dispatch(testsActions.updateAiTest({ name, result }));

      if (selectedRequestId)
        dispatch(
          testsActions.updateAiTestResults({
            name,
            requestId: selectedRequestId,
            result,
          }),
        );
    },
    [aiTests, selectedRequestId, dispatch],
  );

  const executeAiTestsGeneration = useCallback(
    async (options: TestOptions | null) => {
      if (!options || !activeAiProvider) return;

      dispatch(testsActions.setAiRunning(true));

      aiTestsInstance = new AiTests(
        { crudTests, dataDrivenTests, performanceTests, securityTests },
        activeAiProvider,
        options,
      );
      const { overview, results, usage } = await aiTestsInstance.run();

      dispatch(testsActions.setAiRunning(false));
      dispatch(testsActions.setAiTests({ overview, results, usage }));

      if (selectedRequestId)
        dispatch(
          testsActions.addAiTestResults({
            overview,
            requestId: selectedRequestId,
            results,
            usage,
          }),
        );
    },
    [activeAiProvider, crudTests, dataDrivenTests, performanceTests, securityTests, selectedRequestId, dispatch],
  );

  const executeDataDrivenTests = useCallback(
    async (options: TestOptions, execute = true): Promise<TestResult[]> => {
      if (!execute) return [];

      dispatch(testsActions.setDataDrivenRunning(true));
      dispatch(testsActions.setDataDrivenTests([]));

      dataDrivenTestsInstance = new DataDrivenTests(options, incrementCurrentTest);
      const dataDrivenTestResults = await dataDrivenTestsInstance.run();

      dispatch(testsActions.setDataDrivenTests(dataDrivenTestResults));
      dispatch(testsActions.setDataDrivenRunning(false));

      return dataDrivenTestResults;
    },
    [dispatch, incrementCurrentTest],
  );

  const executeLargePayloadTest = useCallback(
    async (options: TestOptions, size: number) => {
      dispatch(testsActions.setLargePayloadTestRunning(true));

      const largePayloadTest = await runLargePayloadTest(options, size);

      dispatch(
        testsActions.updateSecurityTest({
          name: LARGE_PAYLOAD_TEST_NAME,
          result: largePayloadTest,
        }),
      );
      dispatch(testsActions.setLargePayloadTestRunning(false));

      if (selectedRequestId)
        dispatch(
          testsActions.updateSecurityTestResults({
            name: LARGE_PAYLOAD_TEST_NAME,
            requestId: selectedRequestId,
            result: largePayloadTest,
          }),
        );
    },
    [selectedRequestId, dispatch],
  );

  const executeLoadTest = useCallback(
    async (options: TestOptions, threadCount: number, requestCount: number) => {
      const formatLoadTestProgress = (loadBar: string, sentRequestCount: number, requestCount: number): string => {
        return `${loadBar} (${sentRequestCount}/${requestCount})`;
      };

      const generateLoadBarProgress = (percent: number) => {
        const width = 20;
        const filled = Math.round((percent / 100) * width);
        return '▓'.repeat(filled) + '░'.repeat(width - filled) + ` ${percent}%`;
      };

      dispatch(testsActions.setLoadTestRunning(true));
      dispatch(testsActions.setLoadProgress(0));

      dispatch(
        testsActions.updatePerformanceTest({
          name: LOAD_TEST_NAME,
          result: {
            actual: formatLoadTestProgress(generateLoadBarProgress(0), 0, requestCount),
            expected: LOAD_TEST_EXPECTED,
            name: LOAD_TEST_NAME,
            status: performanceTests.find((test) => test.name === LOAD_TEST_NAME)?.status || 'info',
          } as TestResult,
        }),
      );

      let lastPercent = 0;
      const updateLoadProgress = (sentRequestCount: number, totalRequestCount: number) => {
        const percent = Math.floor((sentRequestCount / totalRequestCount) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          dispatch(testsActions.setLoadProgress(percent));
          dispatch(
            testsActions.updatePerformanceTest({
              name: LOAD_TEST_NAME,
              result: {
                actual: formatLoadTestProgress(generateLoadBarProgress(percent), sentRequestCount, totalRequestCount),
                expected: LOAD_TEST_EXPECTED,
                name: LOAD_TEST_NAME,
                status: performanceTests.find((test) => test.name === LOAD_TEST_NAME)?.status || 'info',
              } as TestResult,
            }),
          );
        }
      };

      const loadTestResult = await runLoadTest(options, threadCount, requestCount, updateLoadProgress);

      dispatch(
        testsActions.updatePerformanceTest({
          name: LOAD_TEST_NAME,
          result: loadTestResult,
        }),
      );
      dispatch(testsActions.setLoadTestRunning(false));

      if (selectedRequestId)
        dispatch(
          testsActions.updatePerformanceTestResults({
            name: LOAD_TEST_NAME,
            requestId: selectedRequestId,
            result: loadTestResult,
          }),
        );
    },
    [performanceTests, selectedRequestId, dispatch],
  );

  const executePendingAiTests = useCallback(async () => {
    abortAiTests = false;

    dispatch(testsActions.setAiTestsRunning(true));

    for (const aiTest of pendingAiTests) {
      if (abortAiTests) break;
      await executeAiTest(aiTest.name);
    }

    dispatch(testsActions.setAiTestsRunning(false));
  }, [pendingAiTests, dispatch, executeAiTest]);

  const executePerformanceTests = useCallback(
    async (options: TestOptions, testResults: TestResult[] = [], execute = true): Promise<TestResult[]> => {
      if (!execute) return [];

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
    },
    [disabledPerformanceInsights, dispatch, incrementCurrentTest],
  );

  const executeSecurityTests = useCallback(
    async (options: TestOptions, execute = true): Promise<{ crudTests: TestResult[]; securityTests: TestResult[] }> => {
      if (!execute) return { crudTests: [], securityTests: [] };

      dispatch(testsActions.setSecurityRunning(true));
      dispatch(testsActions.setSecurityTests([]));
      dispatch(testsActions.setCrudTests([]));

      securityTestsInstance = new SecurityTests(options, disabledSecurityTests, incrementCurrentTest);
      const { crudTests, securityTests } = await securityTestsInstance.run();

      dispatch(testsActions.setCrudTests(crudTests));
      dispatch(testsActions.setSecurityTests(securityTests));
      dispatch(testsActions.setSecurityRunning(false));

      return { crudTests, securityTests };
    },
    [disabledSecurityTests, dispatch, incrementCurrentTest],
  );

  const executeAllTests = useCallback(
    async (options: TestOptions) => {
      abortAllTests = false;

      dispatch(testsActions.setOptions(options));
      dispatch(testsActions.startAllTests());

      const count =
        (await calculateDataDrivenTestsCount(options)) +
        getTestCount(DataDrivenTests) +
        getTestCount(SecurityTests) +
        getTestCount(PerformanceInsights) -
        disabledSecurityTests.length +
        (disabledSecurityTests.includes(OPTIONS_METHOD_HANDLING_TEST_NAME) ? -1 : 0) -
        disabledPerformanceInsights.length;
      const timestamp = new Date().getTime();

      dispatch(testsActions.setCount(count));
      dispatch(testsActions.setTimestamp(timestamp));

      const { crudTests, securityTests } = await executeSecurityTests(options, !abortAllTests);
      const dataDrivenTests = await executeDataDrivenTests(options, !abortAllTests);
      const performanceTests = await executePerformanceTests(options, dataDrivenTests, !abortAllTests);

      if (!abortAllTests && selectedRequestId)
        dispatch(
          testsActions.addResults({
            requestId: selectedRequestId,
            results: {
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
    },
    [
      disabledPerformanceInsights,
      disabledSecurityTests,
      selectedRequestId,
      calculateDataDrivenTestsCount,
      dispatch,
      executeDataDrivenTests,
      executePerformanceTests,
      executeSecurityTests,
    ],
  );

  return {
    aiOverview,
    aiRunStartedAt,
    aiTests,
    aiUsage,
    crudTests,
    currentTest,
    dataDrivenTests,
    isAiTestsRunning,
    isDataDrivenRunning,
    isLargePayloadTestRunning,
    isLoadTestRunning,
    isPerformanceRunning,
    isRunningTests,
    isSecurityRunning,
    pendingAiTests,
    performanceTests,
    runningAiTests,
    securityTests,
    testsCount,
    testsTimestamp,
    cancelAiTestsGeneration,
    cancelAllTests,
    executeAiTest,
    executeAiTestsGeneration,
    executeAllTests,
    executeDataDrivenTests,
    executeLargePayloadTest,
    executeLoadTest,
    executePendingAiTests,
    executePerformanceTests,
    executeSecurityTests,
  };
};

export default useTests;
