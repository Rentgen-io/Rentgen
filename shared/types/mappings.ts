import { RequestParameters } from 'shared/types/testing';

export interface MappingsState {
  [key: string]: {
    body: RequestParameters;
    query: RequestParameters;
  };
}
