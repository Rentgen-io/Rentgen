import { MAX_ITERATIONS, MIN_ITERATIONS } from 'src/constants/pre-evaluation';
import i18n from 'src/i18n';
import { EvaluationQuestion, MatchMode, PostmanBody, PreEvaluation } from 'src/types';
import { v4 as uuidv4 } from 'uuid';
import { isObject, toJsonPointer } from './object';

export const CSV_HEADERS = ['prompt', 'contains', 'containsMode', 'notContains', 'notContainsMode'];

/** Why a pre-evaluation can't run, as a translation key (with its interpolation values). */
export interface PreEvaluationError {
  key: string;
  values?: Record<string, number>;
}

/**
 * Why a pre-evaluation can't run with this request and settings, or null when it can. The single source for both
 * disabling "Run" (with the reason as its tooltip) and the check when running.
 *
 * @param promptPointers The body's possible prompt fields (the options the prompt field is picked from)
 */
export function getPreEvaluationError(
  { body, method, url }: { body: PostmanBody; method: string; url: string },
  preEvaluation: PreEvaluation,
  promptPointers: string[],
): PreEvaluationError | null {
  if (!url || ['GET', 'HEAD'].includes(method.toUpperCase()) || body.mode === 'formdata' || body.mode === 'urlencoded')
    return { key: 'preEvaluation.useRequestMethodWithJsonBody' };

  if (!preEvaluation.promptPath || !promptPointers.includes(preEvaluation.promptPath))
    return { key: 'preEvaluation.selectUserPromptField' };

  const { iterations, questions } = preEvaluation;
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS)
    return { key: 'preEvaluation.iterationsMustBeBetween', values: { min: MIN_ITERATIONS, max: MAX_ITERATIONS } };

  const isIncomplete = (question: EvaluationQuestion) =>
    !question.prompt.trim() || (!question.contains.length && !question.notContains.length);
  if (!questions.length || questions.some(isIncomplete))
    return { key: 'preEvaluation.everyQuestionNeedsPromptAndAssertion' };

  return null;
}

const APOSTROPHE_VARIANTS = /[\u2018\u2019\u201B\u02BC\uFF07]/g;
const EXCLUDED_PROMPT_ROLES = ['system', 'developer'];
const EXCLUDED_PROMPT_KEYS = ['role', 'system', 'system_prompt', 'systemprompt', 'developer', 'developer_prompt'];

const isMatchMode = (value: string): value is MatchMode => value === 'AND' || value === 'OR';

function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  const endCell = () => {
    cells.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (cells.some((c) => c.trim())) rows.push(cells);
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (inQuotes) {
      cell += char;
    } else if (char === ',') {
      endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += char;
    }
  }

  if (inQuotes) throw new Error(i18n.t('preEvaluation.unclosedQuotedField'));
  endRow();
  return rows;
}

function parseTerms(value: string, rowNumber: number): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = undefined;
  }

  if (!Array.isArray(parsed) || parsed.some((t) => typeof t !== 'string' || !t.trim()))
    throw new Error(i18n.t('preEvaluation.invalidTerms', { rowNumber }));

  return parsed;
}

export function parseCsv(input: string): EvaluationQuestion[] {
  const [header, ...rows] = tokenizeCsv(input.replace(/^\uFEFF/, ''));

  if (header?.length !== CSV_HEADERS.length || header.some((h, i) => h !== CSV_HEADERS[i]))
    throw new Error(i18n.t('preEvaluation.expectedCsvColumns', { columns: CSV_HEADERS.join(', ') }));

  return rows.map((cells, index) => {
    const rowNumber = index + 2;
    if (cells.length !== CSV_HEADERS.length || !cells[0].trim())
      throw new Error(i18n.t('preEvaluation.invalidCsvRow', { rowNumber }));

    const [prompt, contains, containsMode, notContains, notContainsMode] = cells;
    if (!isMatchMode(containsMode) || !isMatchMode(notContainsMode))
      throw new Error(i18n.t('preEvaluation.invalidOperator', { rowNumber }));

    return {
      id: uuidv4(),
      prompt,
      contains: parseTerms(contains, rowNumber),
      containsMode,
      notContains: parseTerms(notContains, rowNumber),
      notContainsMode,
    };
  });
}

export function toCsv(questions: EvaluationQuestion[]): string {
  const rows = [
    CSV_HEADERS,
    ...questions.map(({ prompt, contains, containsMode, notContains, notContainsMode }) => [
      prompt,
      JSON.stringify(contains),
      containsMode,
      JSON.stringify(notContains),
      notContainsMode,
    ]),
  ];

  // BOM so Excel detects UTF-8; parseCsv strips it again.
  return '\uFEFF' + rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export function findPromptPointers(value: unknown, tokens: string[] = []): string[] {
  if (typeof value === 'string') return tokens.length ? [toJsonPointer(tokens)] : [];
  if (!isObject(value)) return [];
  if (typeof value.role === 'string' && EXCLUDED_PROMPT_ROLES.includes(value.role.toLowerCase())) return [];

  return Object.entries(value).flatMap(([key, child]) =>
    EXCLUDED_PROMPT_KEYS.includes(key.toLowerCase()) ? [] : findPromptPointers(child, [...tokens, key]),
  );
}

function normalizeMatchText(text: string): string {
  return text.normalize('NFC').replace(APOSTROPHE_VARIANTS, "'").toLowerCase();
}

export function evaluate(text: string, question: EvaluationQuestion): string[] {
  const { contains, containsMode, notContains, notContainsMode } = question;
  if (!contains.length && !notContains.length) return [];

  const reasons: string[] = [];
  const normalized = normalizeMatchText(text);

  const matches = (terms: string[], mode: MatchMode) => {
    const test = (term: string) => normalized.includes(normalizeMatchText(term));
    return mode === 'AND' ? terms.every(test) : terms.some(test);
  };

  if (contains.length && !matches(contains, containsMode))
    reasons.push(i18n.t('preEvaluation.missingRequiredText', { containsMode, contains: contains.join(', ') }));

  if (notContains.length && matches(notContains, notContainsMode))
    reasons.push(
      i18n.t('preEvaluation.containsForbiddenText', { notContainsMode, notContains: notContains.join(', ') }),
    );

  return reasons;
}
