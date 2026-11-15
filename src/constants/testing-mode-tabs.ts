/** The HTTP testing mode tabs below the response, in display order. The store keeps the active tab's id. */
export const TESTING_MODE_TABS = [
  { labelKey: 'tests.apiTesting', tab: 'apiTesting' },
  { labelKey: 'preEvaluation.title', tab: 'preEvaluation' },
] as const;

export type TestingModeTab = (typeof TESTING_MODE_TABS)[number]['tab'];
