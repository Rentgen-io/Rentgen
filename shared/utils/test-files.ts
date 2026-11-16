import type { FileFormat } from 'shared/types/testing';

/** The formats a `file` parameter can be tested with, in the order they're offered; all are selected by default. */
export const FILE_FORMATS: FileFormat[] = ['jpg', 'png', 'pdf', 'docx', 'xlsx', 'csv', 'txt'];

/** Formats with a binary structure: a text file with their extension is a fake (any text is a valid CSV / TXT). */
export const BINARY_FILE_FORMATS: FileFormat[] = ['jpg', 'png', 'pdf', 'docx', 'xlsx'];

/**
 * The test files the main process writes for every format (see testFileHandlers), named so the test engine can find
 * them: a valid sample, an empty (0 byte) file, and for a binary format a fake (plain text under its extension).
 */
export type TestFileKind = 'sample' | 'empty' | 'fake';

export function getTestFileName(kind: TestFileKind, format: FileFormat): string {
  return `${kind}.${format}`;
}
