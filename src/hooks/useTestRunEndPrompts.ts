import { useEffect, useRef } from 'react';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCrudTests,
  selectDataDrivenTests,
  selectIsRunningTests,
  selectPerformanceTests,
  selectSecurityTests,
} from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { TestStatus } from 'src/types';
import { DAY_MS, hidePrompt, isPromptHidden } from 'src/utils/prompts';

// localStorage keys holding until when a prompt is hidden (see utils/prompts)
export const FOLLOW_PROMPT_STORAGE_KEY = 'followModalHiddenUntil';
export const GITHUB_PROMPT_STORAGE_KEY = 'gitHubModalHiddenUntil';

/**
 * Shows at most one prompt when a test run finishes: "Follow" when it found a bug, otherwise "Star on GitHub" (unless
 * hidden for now). Only the end of a run counts: loading a saved request's results (also sets them in the store) or
 * results arriving during the run never open a prompt.
 *
 * Watches a single boolean, so its component only re-renders when a run starts / ends, not on every test result.
 */
export function useTestRunEndPrompts() {
  const dispatch = useAppDispatch();
  const isRunningTests = useAppSelector(selectIsRunningTests);

  // Starts with the current value: mounting during a run doesn't count as its end
  const wasRunningRef = useRef(isRunningTests);

  // "Star on GitHub" isn't asked during the first week after installing (nothing stored yet = first start)
  useEffect(() => {
    if (localStorage.getItem(GITHUB_PROMPT_STORAGE_KEY) === null) hidePrompt(GITHUB_PROMPT_STORAGE_KEY, 7 * DAY_MS);
  }, []);

  useEffect(() => {
    const hasRunEnded = wasRunningRef.current && !isRunningTests;
    wasRunningRef.current = isRunningTests;
    if (!hasRunEnded) return;

    const state = store.getState();
    const results = [
      selectCrudTests(state),
      selectDataDrivenTests(state),
      selectPerformanceTests(state),
      selectSecurityTests(state),
    ];
    const hasBug = results.some((tests) => tests.some((test) => test?.status === TestStatus.Bug));
    const hasResults = results.some((tests) => tests.length > 0);

    // A hidden "Follow" prompt lets the "Star on GitHub" one show instead: still one prompt per run
    if (hasBug && !isPromptHidden(FOLLOW_PROMPT_STORAGE_KEY)) dispatch(modalsActions.openFollowModal());
    else if (hasResults && !isPromptHidden(GITHUB_PROMPT_STORAGE_KEY)) dispatch(modalsActions.openGitHubModal());
  }, [isRunningTests, dispatch]);
}
