// Node-only (reads files from disk): used by the Electron main process and the CLI, never by the renderer
import { openAsBlob } from 'fs';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { FormDataBody, RequestBody } from 'shared/types/http';
import { isFormDataBody, isUrlEncodedBody, toLocalFilePath } from 'shared/utils/http';

/**
 * The data to give axios for a request body: a real FormData / URLSearchParams for form bodies (axios then sets the
 * matching Content-Type, multipart with the boundary, unless the request sets one); any other body as it is.
 */
export async function toRequestData(body: RequestBody | undefined): Promise<unknown> {
  if (isUrlEncodedBody(body)) return new URLSearchParams(body.entries);
  if (isFormDataBody(body)) return buildFormData(body);

  return body;
}

/** Text fields first, then the files, each streamed from disk under its file name. */
async function buildFormData({ entries, files = [] }: FormDataBody): Promise<FormData> {
  const formData = new FormData();

  for (const [key, value] of entries) formData.append(key, value);
  for (const [key, rawPath] of files) {
    if (isEmptyFilePath(rawPath)) {
      formData.append(key, new Blob([]), '');
      continue;
    }

    const filePath = toLocalFilePath(rawPath);
    formData.append(key, await openFileAsBlob(filePath), basename(filePath));
  }

  return formData;
}

/**
 * Whether a file part should be sent without a file. Test values arrive JSON-stringified (no file is `""`,
 * a missing one `null`), so the path is read as JSON when it parses.
 */
function isEmptyFilePath(rawPath: string): boolean {
  try {
    return !JSON.parse(rawPath);
  } catch {
    return !rawPath;
  }
}

/**
 * The file as a Blob that is read when the request is sent, so large files are not loaded into memory.
 * Checked with `stat` first: `openAsBlob` fails with a vague "Unable to open file as blob" for a missing file,
 * and accepts a folder (which would be sent as an empty part).
 */
async function openFileAsBlob(filePath: string): Promise<Blob> {
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not a file');

    return await openAsBlob(filePath);
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'file not found' : (error as Error).message;
    throw new Error(`Cannot read form-data file "${filePath}": ${reason}`, { cause: error });
  }
}
