import type { FileFormat } from 'shared/types/testing';

/** The formats a `file` parameter can be tested with, in the order they're offered; all are selected by default. */
export const FILE_FORMATS: FileFormat[] = ['jpg', 'png', 'pdf', 'docx', 'xlsx', 'csv', 'txt'];

/** The name of a format's sample file, which the main process writes (see testFileHandlers) for the test engine. */
export function getTestFileName(format: FileFormat): string {
  return `sample.${format}`;
}
