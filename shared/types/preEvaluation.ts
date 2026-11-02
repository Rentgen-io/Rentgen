import { HttpRequest, HttpResponse } from './http';

export interface EvaluationQuestion {
  id: string;
  prompt: string;
  contains: string[];
  notContains: string[];
  containsMode: 'AND' | 'OR';
  notContainsMode: 'AND' | 'OR';
}
export interface EvaluationResult {
  questionId: string;
  prompt: string;
  iteration: number;
  request: HttpRequest;
  response?: HttpResponse;
  reasons: string[];
}
export interface PreEvaluation {
  promptPath: string;
  responsePath: string;
  iterations: number;
  questions: EvaluationQuestion[];
  report?: { startedAt: string; finishedAt?: string; planned: number; results: EvaluationResult[] };
}
