import { HttpRequest, HttpResponse } from './http';

export type MatchMode = 'AND' | 'OR';

export interface EvaluationQuestion {
  id: string;
  prompt: string;
  contains: string[];
  notContains: string[];
  containsMode: MatchMode;
  notContainsMode: MatchMode;
}

export interface EvaluationResult {
  iteration: number;
  questionId: string;
  prompt: string;
  request: HttpRequest;
  response?: HttpResponse;
  reasons: string[];
}

export interface EvaluationReport {
  finishedAt?: string;
  planned: number;
  results: EvaluationResult[];
  startedAt: string;
}

export interface PreEvaluation {
  iterations: number;
  promptPath: string;
  questions: EvaluationQuestion[];
  report?: EvaluationReport;
  responsePath: string;
}
