import { useCallback } from 'react';
import { getDatasets } from 'src/constants/datasets';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCrudTests,
  selectCurrentTest,
  selectDataDrivenTests,
  selectDisabledPerformanceInsights,
  selectDisabledSecurityTests,
  selectIsDataDrivenRunning,
  selectIsLargePayloadTestRunning,
  selectIsLoadTestRunning,
  selectIsPerformanceRunning,
  selectIsSecurityRunning,
  selectPerformanceTests,
  selectSecurityTests,
  selectSelectedRequestId,
  selectTestEngineConfiguration,
  selectTestsCount,
  selectTestsTimestamp,
} from 'src/store/selectors';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  DataDrivenTests,
  generateDynamicTestData,
  LARGE_PAYLOAD_TEST_NAME,
  LOAD_TEST_NAME,
  OPTIONS_METHOD_HANDLING_TEST_NAME,
  PerformanceInsights,
  runDataDrivenTests,
  runLargePayloadTest,
  runLoadTest,
  SecurityTests,
} from 'src/test-engine';
import { getTestCount } from 'src/test-engine/decorators';
import { ParameterValue, TestOptions, TestResult } from 'src/types';

let abortAllTests = false;
let dataDrivenTestsInstance: DataDrivenTests | null = null;
let performanceInsightsInstance: PerformanceInsights | null = null;
let securityTestsInstance: SecurityTests | null = null;

const useTests = () => {
  const dispatch = useAppDispatch();

  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  const currentTest = useAppSelector(selectCurrentTest);
  const testsCount = useAppSelector(selectTestsCount);
  const testsTimestamp = useAppSelector(selectTestsTimestamp);

  const crudTests = useAppSelector(selectCrudTests);
  const dataDrivenTests = useAppSelector(selectDataDrivenTests);
  const performanceTests = useAppSelector(selectPerformanceTests);
  const securityTests = useAppSelector(selectSecurityTests);

  const isDataDrivenRunning = useAppSelector(selectIsDataDrivenRunning);
  const isLargePayloadTestRunning = useAppSelector(selectIsLargePayloadTestRunning);
  const isLoadTestRunning = useAppSelector(selectIsLoadTestRunning);
  const isPerformanceRunning = useAppSelector(selectIsPerformanceRunning);
  const isSecurityRunning = useAppSelector(selectIsSecurityRunning);

  const testEngineConfiguration = useAppSelector(selectTestEngineConfiguration);
  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const emailConfiguration = testEngineConfiguration.email;

  const incrementCurrentTest = useCallback(() => {
    dispatch(testsActions.incrementCurrentTest());
  }, [dispatch]);

  const calculateDataDrivenTestsCount = useCallback(async (options: TestOptions): Promise<number> => {
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
  }, []);

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
              count,
              timestamp,
              crudTests,
              dataDrivenTests,
              performanceTests,
              securityTests,
              testOptions: options,
            },
          }),
        );
    },
    [
      disabledPerformanceInsights,
      disabledSecurityTests,
      selectedRequestId,
      dispatch,
      calculateDataDrivenTestsCount,
      executeSecurityTests,
      executeDataDrivenTests,
      executePerformanceTests,
    ],
  );

  const executeLargePayloadTest = useCallback(
    async (options: TestOptions, size: number) => {
      dispatch(testsActions.setLargePayloadTestRunning(true));

      const largePayloadTest = await runLargePayloadTest(options, size);

      dispatch(
        testsActions.updateSecurityTest({
          testName: LARGE_PAYLOAD_TEST_NAME,
          result: largePayloadTest,
        }),
      );
      dispatch(testsActions.setLargePayloadTestRunning(false));

      if (selectedRequestId)
        dispatch(
          testsActions.updateSecurityTestResults({
            requestId: selectedRequestId,
            testName: LARGE_PAYLOAD_TEST_NAME,
            result: largePayloadTest,
          }),
        );
    },
    [selectedRequestId, dispatch],
  );

  const cancelAllTests = useCallback(() => {
    abortAllTests = true;

    securityTestsInstance?.abort();
    dataDrivenTestsInstance?.abort();
    performanceInsightsInstance?.abort();

    dispatch(testsActions.resetTests());
  }, [dispatch]);

  const generateLoadBarProgress = (percent: number) => {
    const width = 20;
    const filled = Math.round((percent / 100) * width);
    return '▓'.repeat(filled) + '░'.repeat(width - filled) + ` ${percent}%`;
  };

  const formatLoadTestProgress = (loadBar: string, sentRequestCount: number, requestCount: number): string => {
    return `${loadBar} (${sentRequestCount}/${requestCount})`;
  };

  const executeLoadTest = useCallback(
    async (options: TestOptions, threadCount: number, requestCount: number) => {
      dispatch(testsActions.setLoadTestRunning(true));
      dispatch(testsActions.setLoadProgress(0));

      // Update initial progress display
      dispatch(
        testsActions.updatePerformanceTest({
          testName: LOAD_TEST_NAME,
          result: {
            name: LOAD_TEST_NAME,
            status: performanceTests.find((t) => t.name === LOAD_TEST_NAME)?.status || 'info',
            expected: '',
            actual: formatLoadTestProgress(generateLoadBarProgress(0), 0, requestCount),
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
              testName: LOAD_TEST_NAME,
              result: {
                name: LOAD_TEST_NAME,
                status: performanceTests.find((t) => t.name === LOAD_TEST_NAME)?.status || 'info',
                expected: '',
                actual: formatLoadTestProgress(generateLoadBarProgress(percent), sentRequestCount, totalRequestCount),
              } as TestResult,
            }),
          );
        }
      };

      const loadTestResult = await runLoadTest(options, threadCount, requestCount, updateLoadProgress);

      dispatch(
        testsActions.updatePerformanceTest({
          testName: LOAD_TEST_NAME,
          result: loadTestResult,
        }),
      );
      dispatch(testsActions.setLoadTestRunning(false));

      if (selectedRequestId)
        dispatch(
          testsActions.updatePerformanceTestResults({
            requestId: selectedRequestId,
            testName: LOAD_TEST_NAME,
            result: loadTestResult,
          }),
        );
    },
    [performanceTests, selectedRequestId, dispatch],
  );

  return {
    crudTests,
    currentTest,
    dataDrivenTests,
    isDataDrivenRunning,
    isLargePayloadTestRunning,
    isLoadTestRunning,
    isPerformanceRunning,
    isSecurityRunning,
    performanceTests,
    securityTests,
    testsCount,
    testsTimestamp,
    cancelAllTests,
    executeAllTests,
    executeDataDrivenTests,
    executeLargePayloadTest,
    executeLoadTest,
    executeSecurityTests,
    executePerformanceTests,
  };
};

export default useTests;
