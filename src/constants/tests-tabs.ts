/** The test result tabs, in display order. The ids are stable keys; the store keeps the active tab's id. */
export const TESTS_TABS = [
  { labelKey: 'tests.aiTesting', tab: 'ai' },
  { labelKey: 'tests.securityTests', tab: 'security' },
  { labelKey: 'tests.performanceInsights', tab: 'performance' },
  { labelKey: 'tests.dataDrivenTests', tab: 'dataDriven' },
  { labelKey: 'tests.crud', tab: 'crud' },
] as const;

export type TestsTab = (typeof TESTS_TABS)[number]['tab'];
