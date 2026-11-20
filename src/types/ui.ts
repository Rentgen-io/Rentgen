export interface ResponsePanelContext {
  source: 'body' | 'header';
  jsonPath?: string | null;
  jsonValue?: string | null;
}
