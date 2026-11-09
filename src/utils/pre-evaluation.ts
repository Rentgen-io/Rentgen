import i18n from 'src/i18n';
import { EvaluationQuestion, MatchMode } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

export const CSV_HEADERS = ['prompt', 'contains', 'containsMode', 'notContains', 'notContainsMode'];

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

export function tryGetPromptPaths(value: unknown, path = ''): string[] {
  try {
    if (typeof value === 'string') return [path];
    if (!value || typeof value !== 'object') return [];

    const obj = value as Record<string, unknown>;
    if (typeof obj.role === 'string' && ['system', 'developer'].includes(obj.role.toLowerCase())) return [];

    return Object.entries(obj).flatMap(([key, child]) =>
      ['role', 'system', 'system_prompt', 'systemprompt', 'developer', 'developer_prompt'].includes(key.toLowerCase())
        ? []
        : tryGetPromptPaths(child, `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`),
    );
  } catch {
    return [];
  }
}
