import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'src/store';
import { extractStatusCode } from 'src/utils';

export const selectHttpResponse = (state: RootState) => state.response.httpResponse;
export const selectStatusCode = createSelector([selectHttpResponse], (response) => extractStatusCode(response));
