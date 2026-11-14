/** The HTTP testing mode tabs below the response, in display order. The store keeps the active tab's index. */
export const TESTING_MODE_TABS = [
  { id: 'apiTesting', labelKey: 'tests.apiTesting' },
  { id: 'preEvaluation', labelKey: 'preEvaluation.title' },
] as const;

export type TestingModeTabId = (typeof TESTING_MODE_TABS)[number]['id'];

export const TESTING_MODE_TAB_INDEX = Object.fromEntries(TESTING_MODE_TABS.map(({ id }, index) => [id, index])) as Record<
  TestingModeTabId,
  number
>;
