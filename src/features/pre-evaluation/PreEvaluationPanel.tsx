import { useEffect, useRef, useState } from 'react';
import { EvaluationQuestion, EvaluationResult, PreEvaluation } from 'shared/types/preEvaluation';
import { store } from 'src/store';
import { sendHttp } from 'src/api/network';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { extractStatusCode, substituteRequestVariables } from 'src/utils';
import { selectSelectedEnvironment, selectDynamicVariables } from 'src/store/selectors';
import { defaults, download, evaluate, parseCsv, questionsCsv, readPointer, replacePrompt, stringPaths } from './engine';

const inputClass = 'rounded border border-border dark:border-dark-body bg-transparent p-2 text-xs min-w-0';
function Terms({ values, onChange, disabled }: { values: string[]; onChange: (v: string[]) => void; disabled: boolean }) {
  return <div className="flex flex-wrap gap-1">
    {values.map((v, i) => <span key={i} className="rounded bg-gray-500/20 px-2 py-1 text-xs">{v} <button aria-label={`Remove ${v}`} disabled={disabled} onClick={() => onChange(values.filter((_, j) => j !== i))}>×</button></span>)}
    <input className={inputClass} disabled={disabled} aria-label="Add matching text" placeholder="Add text, press Enter" onKeyDown={e => {
      if (e.key === 'Enter' && e.currentTarget.value.trim()) { onChange([...values, e.currentTarget.value.trim()]); e.currentTarget.value = ''; }
    }} />
  </div>;
}

export default function PreEvaluationPanel() {
  const dispatch = useAppDispatch();
  const request = useAppSelector(s => s.request);
  const id = useAppSelector(s => s.collection.selectedRequestId);
  const saved = useAppSelector(s => s.collection.data.item.flatMap(f => f.item).find(r => r.id === id)?.preEvaluation);
  const environment = useAppSelector(selectSelectedEnvironment);
  const variables = useAppSelector(selectDynamicVariables);
  const [initial] = useState(defaults);
  const config = saved ?? request.preEvaluation ?? initial;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const persist = (evaluation: PreEvaluation) => {
    if (store.getState().collection.selectedRequestId === id) dispatch(requestActions.setPreEvaluation(evaluation));
    if (id) dispatch(collectionActions.setPreEvaluation({ requestId: id, evaluation }));
  };
  let paths: string[] = [];
  try { paths = stringPaths(JSON.parse(request.body)); } catch { /* Validation shown below */ }
  const updateQuestion = (index: number, patch: Partial<EvaluationQuestion>) => persist({ ...config, questions: config.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
  const run = async () => {
    if (controller.current) return;
    setError('');
    const abort = new AbortController(); controller.current = abort;
    const report: NonNullable<PreEvaluation['report']> = { startedAt: new Date().toISOString(), planned: config.questions.length * config.iterations, results: [] };
    try {
      if (!paths.includes(config.promptPath)) throw new Error('Select a user prompt field in a JSON request body.');
      if (!request.url || ['GET', 'HEAD'].includes(request.method.toUpperCase())) throw new Error('Use a request method that sends a JSON body.');
      if (!Number.isInteger(config.iterations) || config.iterations < 1 || config.iterations > 1000) throw new Error('Iterations must be between 1 and 1000.');
      if (!config.questions.length || config.questions.some(q => !q.prompt.trim() || (!q.contains.length && !q.notContains.length))) throw new Error('Every question needs a prompt and at least one assertion.');
      setRunning(true); setProgress(0);
      const base = substituteRequestVariables(request.url, request.headers, request.body, environment, variables);
      const body = typeof base.body === 'string' ? JSON.parse(base.body) : base.body;
      // Validate against the resolved body as well, before sending anything.
      replacePrompt(body, config.promptPath, '');
      for (const question of config.questions) {
        for (let iteration = 1; iteration <= config.iterations; iteration++) {
          if (abort.signal.aborted) break;
          const outgoing = { ...base, method: request.method, body: replacePrompt(body, config.promptPath, question.prompt) as Record<string, unknown> };
          const result: EvaluationResult = { questionId: question.id, prompt: question.prompt, iteration, request: outgoing, reasons: [] };
          try {
            result.response = await sendHttp(outgoing, abort.signal);
            if (abort.signal.aborted) break;
            const status = extractStatusCode(result.response);
            if (status < 200 || status >= 300) result.reasons.push(`HTTP ${result.response.status}`);
            const responseBody = result.response.body;
            const text = config.responsePath ? readPointer(typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody, config.responsePath) : responseBody;
            if (config.responsePath && typeof text !== 'string') result.reasons.push('Response text field is missing or is not a string.');
            else result.reasons.push(...evaluate(typeof text === 'string' ? text : JSON.stringify(text) ?? '', question));
          } catch (e) {
            if (abort.signal.aborted) break;
            result.reasons.push(e instanceof Error ? e.message : String(e));
          }
          report.results.push(result); setProgress(report.results.length);
        }
        if (abort.signal.aborted) break;
      }
      report.finishedAt = new Date().toISOString();
      persist({ ...config, report });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { controller.current = null; setRunning(false); }
  };
  const results = config.report?.results ?? [];
  const failed = results.filter(r => r.reasons.length);
  const passed = results.length - failed.length;
  return <section className="m-4 flex flex-col gap-4 text-sm">
    <div className="rounded border border-border dark:border-dark-body p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-base">✦ LLM Pre-Evaluation</h2><span className="text-xs opacity-70">Each question runs against the current request and selected environment.</span></div>
      <p className="text-xs opacity-70">Demo assertions are editable examples. Adapt them to your model’s language and refusal wording. Matching ignores case and treats straight and typographic apostrophes as equivalent. OR forbids any listed phrase; AND forbids all phrases appearing together.</p>
      {!id && <p className="text-xs">Save this request to a collection to retain its evaluation and report.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">User prompt field <select className={inputClass} disabled={running} value={config.promptPath} onChange={e => persist({ ...config, promptPath: e.target.value })}><option value="">Select JSON field</option>{paths.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="flex items-center gap-2">Response text field <input className={inputClass} disabled={running} placeholder="Whole body, or /choices/0/message/content" value={config.responsePath} onChange={e => persist({ ...config, responsePath: e.target.value })} /></label>
        <label className="flex items-center gap-2">Iterations per question <input className={`${inputClass} w-24`} type="number" min={1} max={1000} disabled={running} value={config.iterations} onChange={e => persist({ ...config, iterations: Number(e.target.value) })} /></label>
        <Button disabled={running} buttonType={ButtonType.SECONDARY} onClick={() => persist({ ...config, questions: [...config.questions, { id: crypto.randomUUID(), prompt: '', contains: [], notContains: [], containsMode: 'OR', notContainsMode: 'OR' }] })}>+ Add Question</Button>
        <Button disabled={running} buttonType={ButtonType.SECONDARY} onClick={() => file.current?.click()}>Import CSV</Button>
        <Button buttonType={ButtonType.SECONDARY} onClick={() => download('pre-evaluation.csv', questionsCsv(config.questions.length ? config.questions : defaults().questions), 'text/csv;charset=utf-8')}>Download CSV Example</Button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={async e => {
          const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return;
          try { const questions = parseCsv(await selected.text()); persist({ ...config, questions }); setError(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        }} />
      </div>
      {!paths.length && <p role="status">A JSON body with a user prompt string is required. System and developer messages cannot be selected.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">#</th><th>Question / Prompt</th><th>Contains (required)</th><th>Not Contains (forbidden)</th><th /></tr></thead><tbody>
        {config.questions.map((q, i) => <tr key={q.id} className="border-t border-border dark:border-dark-body"><td className="p-2">{i + 1}</td><td className="p-2"><textarea disabled={running} className={`${inputClass} w-64`} aria-label={`Question ${i + 1}`} value={q.prompt} onChange={e => updateQuestion(i, { prompt: e.target.value })} /></td>
          {(['contains', 'notContains'] as const).map(kind => <td key={kind} className="p-2"><div className="flex items-start gap-2"><select className={inputClass} aria-label={`${kind} operator for question ${i + 1}`} disabled={running} value={q[`${kind}Mode`]} onChange={e => updateQuestion(i, { [`${kind}Mode`]: e.target.value })}><option>OR</option><option>AND</option></select><Terms values={q[kind]} disabled={running} onChange={v => updateQuestion(i, { [kind]: v })} /></div></td>)}
          <td><button disabled={running} aria-label={`Delete question ${i + 1}`} onClick={() => persist({ ...config, questions: config.questions.filter((_, j) => j !== i) })}>×</button></td></tr>)}
      </tbody></table></div>
      {error && <p role="alert" className="text-red-500">{error}</p>}
      <div className="flex gap-3 items-center"><Button disabled={running || request.isSending} onClick={run}>▶ Run Pre-Evaluation</Button>{running && <><Button buttonType={ButtonType.SECONDARY} onClick={() => controller.current?.abort()}>Stop</Button><span role="status">{progress} / {config.questions.length * config.iterations}</span></>}</div>
    </div>
    {config.report && <div className="rounded border border-border dark:border-dark-body p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Pre-Evaluation Report</h2><Button buttonType={ButtonType.SECONDARY} onClick={() => download('pre-evaluation-report.json', JSON.stringify(config.report, null, 2), 'application/json')}>Export report</Button></div>
      <p className="text-xs opacity-70">Last run: {new Date(config.report.startedAt).toLocaleString()} · Completed {results.length} / {config.report.planned}</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Questions', new Set(results.map(r => r.questionId)).size], ['Total runs', results.length], ['Passed', passed], ['Failed', failed.length], ['Compliance rate', results.length ? `${(passed / results.length * 100).toFixed(1)}%` : '—']].map(([label, value]) => <div key={label} className="border border-border dark:border-dark-body rounded p-3"><div className="text-xs">{label}</div><strong className="text-2xl">{value}</strong></div>)}</div>
      <h3 className="font-semibold">Results per Question</h3>
      {Array.from(new Set(results.map(r => r.questionId))).map(qid => { const runs = results.filter(r => r.questionId === qid); const count = runs.filter(r => !r.reasons.length).length; return <div key={qid} className="flex items-center gap-3"><span className="w-1/2 truncate">{runs[0].prompt}</span><progress className="flex-1 accent-green-500" value={count} max={runs.length} /><span>{count} / {runs.length} passed</span></div>; })}
      <h3 className="font-semibold">Failed Responses ({failed.length})</h3>
      {failed.map((r, i) => <details key={i} className="border border-border dark:border-dark-body rounded p-2"><summary className="cursor-pointer">{r.prompt} · Run #{r.iteration} · <span className="text-red-500">{r.reasons.join('; ')}</span></summary><div className="grid lg:grid-cols-2 gap-3 mt-3"><div><h4>Request</h4><pre className="text-xs whitespace-pre-wrap break-all max-h-96 overflow-auto">{JSON.stringify(r.request, null, 2)}</pre></div><div><h4>Response</h4><pre className="text-xs whitespace-pre-wrap break-all max-h-96 overflow-auto">{JSON.stringify(r.response ?? { error: r.reasons }, null, 2)}</pre></div></div></details>)}
    </div>}
  </section>;
}
