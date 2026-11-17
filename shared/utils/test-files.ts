import type { FileFormat, FileFormatGroup } from 'shared/types/testing';

/** The formats a `file` parameter can be tested with, by group, in the order they're offered. */
export const FILE_FORMAT_GROUPS: Record<FileFormatGroup, FileFormat[]> = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'svg', 'ico'],
  documents: ['pdf', 'docx', 'txt', 'json'],
  spreadsheets: ['xlsx', 'csv'],
};

/** Every format, in the order they're offered; all are selected by default. */
export const FILE_FORMATS: FileFormat[] = Object.values(FILE_FORMAT_GROUPS).flat();

/** The name of a format's sample file, which the main process writes (see testFileHandlers) for the test engine. */
export function getTestFileName(format: FileFormat): string {
  return `sample.${format}`;
}
