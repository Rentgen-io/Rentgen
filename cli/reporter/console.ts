import chalk from 'chalk';
import { version } from '../../package.json';
import type { RequestResult, RunResult, VerboseDetails } from '../runner/types';

export interface HeaderContext {
  projectName: string;
  folderName: string;
  environmentTitle: string | null;
  totalRequests: number;
}

// A request's status line and section labels, and the details under them
const LABEL_INDENT = '      ';
const DETAIL_INDENT = '        ';

export class ConsoleReporter {
  constructor(private options: { verbose: boolean; noColor: boolean }) {
    if (options.noColor) {
      chalk.level = 0;
    }
  }

  printHeader(ctx: HeaderContext): void {
    const envLabel = ctx.environmentTitle ?? 'none';
    process.stdout.write(chalk.bold(`Rentgen CLI v${version}`) + '\n');
    process.stdout.write('\n');
    process.stdout.write(`${ctx.projectName} › ${ctx.folderName} · env: ${envLabel} (${ctx.totalRequests} requests)\n`);
    process.stdout.write(chalk.dim('─'.repeat(40)) + '\n');
    process.stdout.write('\n');
  }

  printResult(result: RequestResult, index: number, total: number): void {
    const tag = `[${index}/${total}]`;
    process.stdout.write(`${tag} ${result.method} ${result.url}\n`);

    if (result.error) {
      const [firstLine, ...detailLines] = result.error.split('\n');
      this.writeLine(this.indent(`${chalk.red('✗')} ${chalk.red(`Network Error: ${firstLine}`)}`, LABEL_INDENT));
      for (const line of detailLines) this.writeLine(this.indent(chalk.dim(line)));
    } else if (result.success) {
      this.writeLine(
        this.indent(
          `${chalk.green('✓')} ${chalk.green(result.statusText)} ${chalk.dim(`(${result.duration}ms)`)}`,
          LABEL_INDENT,
        ),
      );
    } else {
      this.writeLine(
        this.indent(
          `${chalk.red('✗')} ${chalk.red(result.statusText)} ${chalk.dim(`(${result.duration}ms)`)}`,
          LABEL_INDENT,
        ),
      );
    }

    if (this.options.verbose && result.verbose) {
      this.printVerboseDetails(result.verbose);
    }

    process.stdout.write('\n');
  }

  printSummary(result: RunResult): void {
    process.stdout.write(chalk.dim('─'.repeat(40)) + '\n');

    const parts = [
      result.passed > 0 ? chalk.green(`${result.passed} passed`) : `${result.passed} passed`,
      result.failed > 0 ? chalk.red(`${result.failed} failed`) : `${result.failed} failed`,
    ];
    if (result.errors > 0) parts.push(chalk.red(`${result.errors} errors`));

    process.stdout.write(`Results: ${parts.join(', ')}\n`);
    process.stdout.write(`Duration: ${this.formatDuration(result.duration)}\n`);

    const failed = result.results.filter((r) => !r.success);
    if (failed.length > 0) {
      process.stdout.write('\n');
      process.stdout.write(chalk.red('Failed:') + '\n');
      for (const r of failed) {
        const idx = result.results.indexOf(r) + 1;
        const total = result.totalRequests;
        const path = this.extractPath(r.url);
        const errorFirstLine = r.error?.split('\n')[0] ?? '';
        const reason = r.error ? `Network Error: ${errorFirstLine}` : r.statusText;
        process.stdout.write(`  [${idx}/${total}] ${r.method} ${path} — ${reason}\n`);
      }
    }
  }

  private printVerboseDetails(verbose: VerboseDetails): void {
    if (verbose.unresolvedVariables.length > 0) {
      this.writeLine(
        this.indent(
          `${chalk.yellow('⚠')} ${chalk.yellow(
            `Unresolved variables (substituted as empty string): ${verbose.unresolvedVariables.join(', ')}`,
          )}`,
          LABEL_INDENT,
        ),
      );
    }

    this.writeLabel('Request Headers:');
    this.writeHeaders(verbose.requestHeaders);

    if (verbose.requestBody) {
      this.writeLabel('Request Body:');
      this.writeLine(chalk.dim(this.indent(this.truncate(verbose.requestBody, 500))));
    }

    this.writeLabel('Response Headers:');
    this.writeHeaders(verbose.responseHeaders);

    this.writeLabel('Response Body:');
    this.writeLine(chalk.dim(this.indent(this.truncate(verbose.responseBody, 1000))));

    if (verbose.dynamicVarDetails.length > 0) {
      this.writeLabel('Dynamic Variables:');
      for (const dv of verbose.dynamicVarDetails) {
        this.writeLine(
          this.indent(
            dv.extracted
              ? `${chalk.green('✓')} ${chalk.dim(`${dv.key} = "${dv.value}" (extracted from ${dv.source}: ${dv.selector})`)}`
              : `${chalk.yellow('⚠')} ${chalk.yellow(`${dv.key} — ${dv.error}`)}`,
          ),
        );
      }
    }
  }

  private writeLabel(label: string): void {
    this.writeLine(chalk.dim(this.indent(label, LABEL_INDENT)));
  }

  /** One `name: value` line per header; a multi-line value stays indented too. */
  private writeHeaders(headers: Record<string, string>): void {
    for (const [key, value] of Object.entries(headers)) this.writeLine(chalk.dim(this.indent(`${key}: ${value}`)));
  }

  private writeLine(text: string): void {
    process.stdout.write(`${text}\n`);
  }

  /** Indents every line of the text, so a multi-line one (form fields, formatted JSON) stays under its label. */
  private indent(text: string, prefix = DETAIL_INDENT): string {
    return text.replace(/^/gm, prefix);
  }

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '... (truncated)';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private extractPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}
