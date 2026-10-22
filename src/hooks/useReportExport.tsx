import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import { generateCertificate as generateCertificateFile, saveReport } from 'src/api/files';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCurrentTestResults, selectExportFormat, selectHttpResponse } from 'src/store/selectors';
import { ExportReport } from 'src/types';
import { buildSuite, formatReport } from 'src/utils';
import { notify } from 'src/utils/toast';

const MINIMUM_TESTS_FOR_CERTIFICATE = 70;

export function useReportExport() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const testResults = useAppSelector(selectCurrentTestResults);
  const exportFormat = useAppSelector(selectExportFormat);
  const httpResponse = useAppSelector(selectHttpResponse);

  const exportReport = useCallback(async () => {
    if (!testResults || !testResults.testOptions) return;

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
      lastHttpResponse: httpResponse,
      suites: [
        buildSuite('AI Tests', aiTests ?? [], aiUsage ?? null),
        buildSuite('Security Tests', securityTests),
        buildSuite('Performance Insights', performanceTests),
        buildSuite('Data-Driven Tests', dataDrivenTests),
        buildSuite('CRUD', crudTests),
      ],
    };

    try {
      const result = await saveReport(formatReport(report, exportFormat));

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.exported'), { toastId: 'success-export-report' });
    } catch (error) {
      console.error(error);
      notify.error(t('tests.failedToExport'), { toastId: 'error-export-report' });
    }
  }, [testResults, exportFormat, httpResponse, dispatch]);

  const generateCertificate = useCallback(async () => {
    if (!testResults || testResults.count < MINIMUM_TESTS_FOR_CERTIFICATE) {
      notify.error(t('tests.notEligible'), { toastId: 'error-generate-certificate' });
      return;
    }

    try {
      const result = await generateCertificateFile(testResults);

      if (result?.error) throw new Error(result.error);
      if (result?.canceled) return;

      notify.success(t('common.certificated'), { toastId: 'success-generate-certificate' });
    } catch (error) {
      console.error(error);
      notify.error(t('tests.failedToGenerateCertificate'), { toastId: 'error-generate-certificate' });
    }
  }, [testResults, t, dispatch]);

  return { exportReport, generateCertificate };
}
