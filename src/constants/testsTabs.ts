/** The test result tabs, in display order. The ids are stable keys; the store keeps the active tab's index. */
export const TESTS_TABS = [
  { id: 'ai', labelKey: 'tests.aiTesting' },
  { id: 'security', labelKey: 'tests.securityTests' },
  { id: 'performance', labelKey: 'tests.performanceInsights' },
  { id: 'dataDriven', labelKey: 'tests.dataDrivenTests' },
  { id: 'crud', labelKey: 'tests.crud' },
] as const;

export type TestsTabId = (typeof TESTS_TABS)[number]['id'];

export const TESTS_TAB_INDEX = Object.fromEntries(TESTS_TABS.map(({ id }, index) => [id, index])) as Record<
  TestsTabId,
  number
>;
