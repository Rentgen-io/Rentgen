import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_PRE_EVALUATION } from 'src/constants/pre-evaluation';
import { EvaluationQuestion, EvaluationReport, PreEvaluation } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

interface PreEvaluationState {
  currentRun: number;
  isRunning: boolean;
  preEvaluation: PreEvaluation | null;
}

const initialState: PreEvaluationState = {
  currentRun: 0,
  isRunning: false,
  preEvaluation: null,
};

const ensurePreEvaluation = (state: PreEvaluationState): PreEvaluation =>
  (state.preEvaluation ??= structuredClone(DEFAULT_PRE_EVALUATION));

export const preEvaluationSlice = createSlice({
  name: 'preEvaluation',
  initialState,
  reducers: {
    addPreEvaluationQuestion: {
      reducer: (state, action: PayloadAction<EvaluationQuestion>) => {
        ensurePreEvaluation(state).questions.push(action.payload);
      },
      prepare: () => ({
        payload: {
          id: uuidv4(),
          prompt: '',
          contains: [],
          notContains: [],
          containsMode: 'OR',
          notContainsMode: 'OR',
        } satisfies EvaluationQuestion,
      }),
    },
    removePreEvaluationQuestion: (state, action: PayloadAction<string>) => {
      const preEvaluation = ensurePreEvaluation(state);
      preEvaluation.questions = preEvaluation.questions.filter((question) => question.id !== action.payload);
    },
    resetPreEvaluation: (state) => {
      state.currentRun = 0;
      state.isRunning = false;
      state.preEvaluation = null;
    },
    setCurrentRun: (state, action: PayloadAction<number>) => {
      state.currentRun = action.payload;
    },
    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    setPreEvaluation: (state, action: PayloadAction<PreEvaluation>) => {
      state.preEvaluation = action.payload;
    },
    setPreEvaluationQuestions: (state, action: PayloadAction<EvaluationQuestion[]>) => {
      ensurePreEvaluation(state).questions = action.payload;
    },
    setPreEvaluationReport: (state, action: PayloadAction<EvaluationReport>) => {
      ensurePreEvaluation(state).report = action.payload;
    },
    updatePreEvaluation: (state, action: PayloadAction<Partial<Omit<PreEvaluation, 'questions'>>>) => {
      Object.assign(ensurePreEvaluation(state), action.payload);
    },
    updatePreEvaluationQuestion: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<Omit<EvaluationQuestion, 'id'>> }>,
    ) => {
      const { id, changes } = action.payload;
      const question = ensurePreEvaluation(state).questions.find((question) => question.id === id);

      if (question) Object.assign(question, changes);
    },
  },
});

export const preEvaluationActions = preEvaluationSlice.actions;
export default preEvaluationSlice.reducer;
