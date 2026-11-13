import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import { exportFile, generateCertificate as generateCertificateFile } from 'src/api/files';
import { store } from 'src/store';
import { selectCurrentTestResults, selectExportFormat, selectHttpResponse } from 'src/store/selectors';
import { ExportReport } from 'src/types';
import { buildSuite, formatReport } from 'src/utils';
import { notify } from 'src/utils/toast';

const MINIMUM_TESTS_FOR_CERTIFICATE = 70;

/**
 * The results are read from the store when exporting (not subscribed to), so the returned callbacks are stable and the
 * calling component doesn't re-render on every test progress update.
 */
export function useReportExport() {
  const { t } = useTranslation();

  const exportReport = useCallback(async () => {
    const state = store.getState();
    const testResults = selectCurrentTestResults(state);

    if (!testResults?.testOptions) return;

    const { aiTests, aiUsage, crudTests, dataDrivenTests, performanceTests, securityTests, testOptions } = testResults;
    const report: ExportReport = {
      generatedAt: new Date().toISOString(),
      generatedBy: appConfig.origin,
      target: {
        url: testOptions.url,
        method: testOptions.method,
        headers: testOptions.headers,
        body: testOptions.body,
      },
      lastHttpResponse: selectHttpResponse(state),
      suites: [
        buildSuite('AI Tests', aiTests ?? [], aiUsage ?? null),
        buildSuite('Security Tests', securityTests),
        buildSuite('Performance Insights', performanceTests),
        buildSuite('Data-Driven Tests', dataDrivenTests),
        buildSuite('CRUD', crudTests),
      ],
    };

    try {
      const result = await exportFile(formatReport(report, selectExportFormat(state)));

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.exported'), { toastId: 'success-export-report' });
    } catch {
      notify.error(t('tests.failedToExport'), { toastId: 'error-export-report' });
    }
  }, [t]);

  const generateCertificate = useCallback(async () => {
    const testResults = selectCurrentTestResults(store.getState());

    if (!testResults || testResults.count < MINIMUM_TESTS_FOR_CERTIFICATE) {
      notify.error(t('tests.notEligible'), { toastId: 'error-generate-certificate' });
      return;
    }

    try {
      const result = await generateCertificateFile(testResults);

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.certificated'), { toastId: 'success-generate-certificate' });
    } catch {
      notify.error(t('tests.failedToGenerateCertificate'), { toastId: 'error-generate-certificate' });
    }
  }, [t]);

  return { exportReport, generateCertificate };
}
