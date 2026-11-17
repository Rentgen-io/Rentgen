import { createSelector } from '@reduxjs/toolkit';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { RootState } from 'src/store';
import { extractStatusCode } from 'src/utils';

export const selectHttpResponse = (state: RootState) => state.response.httpResponse;
export const selectHasHttpResponse = (state: RootState) => Boolean(state.response.httpResponse);

export const selectStatusCode = createSelector([selectHttpResponse], (response) => extractStatusCode(response));
export const selectIsResponseSuccessful = (state: RootState) => {
  if (!selectHasHttpResponse(state)) return false;

  const statusCode = selectStatusCode(state);
  return statusCode >= RESPONSE_STATUS.OK && statusCode < RESPONSE_STATUS.BAD_REQUEST;
};
