import { app, ipcMain, nativeImage } from 'electron';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { crc32, deflateSync } from 'zlib';
import type { FileFormat } from 'shared/types/testing';
import { FILE_FORMATS, getTestFileName } from 'shared/utils/test-files';

const TEST_FILES_DIRECTORY = 'rentgen-test-files';
const SAMPLE_TEXT = 'Rentgen test file';

// ---------- Images ----------

/** A 1×1 white RGB image. */
function createPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    const checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc32(typeAndData));

    return Buffer.concat([length, typeAndData, checksum]);
  };

  // Width 1, height 1, bit depth 8, color type 2 (RGB), compression, filter and interlace 0
  const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  // One scanline: filter type 0, then the pixel
  const pixels = deflateSync(Buffer.from([0, 255, 255, 255]));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The same image, encoded by Chromium. */
function createJpeg(): Buffer {
  return nativeImage.createFromBuffer(createPng()).toJPEG(90);
}

// ---------- PDF ----------

/** A one-page PDF with a line of text; the cross-reference table is computed from the object offsets. */
function createPdf(): Buffer {
  const content = `BT /F1 12 Tf 72 720 Td (${SAMPLE_TEXT}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

// ---------- Office (DOCX, XLSX) ----------

/** A ZIP archive of the given text files, stored without compression (all an Office file needs). */
function createZip(files: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, text] of Object.entries(files)) {
    const fileName = Buffer.from(name, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // Local file header signature
    local.writeUInt16LE(20, 4); // Version needed to extract
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18); // Compressed size
    local.writeUInt32LE(data.length, 22); // Uncompressed size
    local.writeUInt16LE(fileName.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    central.writeUInt16LE(20, 4); // Version made by
    central.writeUInt16LE(20, 6); // Version needed to extract
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fileName.length, 28);
    central.writeUInt32LE(offset, 42); // Offset of the local header

    localParts.push(local, fileName, data);
    centralParts.push(central, fileName);
    offset += local.length + fileName.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  end.writeUInt16LE(centralParts.length / 2, 8); // Entries on this disk
  end.writeUInt16LE(centralParts.length / 2, 10); // Entries in total
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16); // Offset of the central directory

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const RELATIONSHIP_TYPES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

interface OfficePart {
  contentType: string;
  xml: string;
}

/**
 * An Office Open XML package: its parts, their content types, and the relationship to the main part (the first one).
 */
function createOfficePackage(parts: Record<string, OfficePart>, otherFiles: Record<string, string> = {}): Buffer {
  const [mainPart] = Object.keys(parts);
  const overrides = Object.entries(parts)
    .map(([name, { contentType }]) => `<Override PartName="/${name}" ContentType="${contentType}"/>`)
    .join('');

  return createZip({
    '[Content_Types].xml':
      `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      `<Default Extension="xml" ContentType="application/xml"/>${overrides}</Types>`,
    '_rels/.rels':
      `${XML_DECLARATION}<Relationships xmlns="${RELATIONSHIPS_NAMESPACE}">` +
      `<Relationship Id="rId1" Type="${RELATIONSHIP_TYPES}/officeDocument" Target="${mainPart}"/></Relationships>`,
    ...Object.fromEntries(Object.entries(parts).map(([name, { xml }]) => [name, xml])),
    ...otherFiles,
  });
}

/** A Word document with one paragraph. */
function createDocx(): Buffer {
  return createOfficePackage({
    'word/document.xml': {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
      xml:
        `${XML_DECLARATION}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body><w:p><w:r><w:t>${SAMPLE_TEXT}</w:t></w:r></w:p></w:body></w:document>`,
    },
  });
}

/** An Excel workbook with one sheet and one cell. */
function createXlsx(): Buffer {
  const spreadsheetNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

  return createOfficePackage(
    {
      'xl/workbook.xml': {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
        xml:
          `${XML_DECLARATION}<workbook xmlns="${spreadsheetNamespace}" xmlns:r="${RELATIONSHIP_TYPES}">` +
          '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      },
      'xl/worksheets/sheet1.xml': {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
        xml:
          `${XML_DECLARATION}<worksheet xmlns="${spreadsheetNamespace}"><sheetData><row r="1">` +
          `<c r="A1" t="inlineStr"><is><t>${SAMPLE_TEXT}</t></is></c></row></sheetData></worksheet>`,
      },
    },
    {
      'xl/_rels/workbook.xml.rels':
        `${XML_DECLARATION}<Relationships xmlns="${RELATIONSHIPS_NAMESPACE}">` +
        `<Relationship Id="rId1" Type="${RELATIONSHIP_TYPES}/worksheet" Target="worksheets/sheet1.xml"/>` +
        '</Relationships>',
    },
  );
}

// ---------- Files ----------

const SAMPLES: Record<FileFormat, () => Buffer | string> = {
  jpg: createJpeg,
  png: createPng,
  pdf: createPdf,
  docx: createDocx,
  xlsx: createXlsx,
  csv: () => `id,name\n1,${SAMPLE_TEXT}\n`,
  txt: () => `${SAMPLE_TEXT}\n`,
};

/**
 * Writes a sample file of every format into the app's temp directory (rewritten on each call, so they're always
 * intact) and returns that directory. The test engine finds them by getTestFileName().
 */
export async function prepareTestFiles(): Promise<string> {
  const directory = join(app.getPath('temp'), TEST_FILES_DIRECTORY);
  await mkdir(directory, { recursive: true });

  await Promise.all(
    FILE_FORMATS.map((format) => writeFile(join(directory, getTestFileName(format)), SAMPLES[format]())),
  );

  return directory;
}

export function registerTestFileHandlers(): void {
  ipcMain.handle('prepare-test-files', (): Promise<string> => prepareTestFiles());
}
