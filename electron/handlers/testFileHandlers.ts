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

/** A 1×1 white GIF: a 2-color palette and one LZW-coded pixel (clear code, color 0, end code). */
function createGif(): Buffer {
  return Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    Buffer.from([1, 0, 1, 0, 0x80, 0, 0]), // 1×1, global palette of 2 colors
    Buffer.from([0xff, 0xff, 0xff, 0, 0, 0]), // White, black
    Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0]), // Image at 0,0 of 1×1
    Buffer.from([2, 2, 0x44, 0x01, 0, 0x3b]), // LZW minimum code size 2, one data block, trailer
  ]);
}

/** A 1×1 lossless WebP (the common feature-detection image). */
function createWebp(): Buffer {
  return Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
}

/** A 1×1 AVIF (an AV1 image in a HEIF container; the common feature-detection image). */
const AVIF_BASE64 =
  'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

function createAvif(): Buffer {
  return Buffer.from(AVIF_BASE64, 'base64');
}

/**
 * The AVIF image under another HEIF major brand: "mif1" makes it a generic HEIF file. "heic" marks it as an HEIC file
 * (what servers check), though a real HEIC image is HEVC-coded, which only a full encoder can produce.
 */
function createHeif(majorBrand: 'heic' | 'mif1'): Buffer {
  const heif = createAvif();
  heif.write(majorBrand, 8, 'ascii'); // The ftyp box's major brand

  return heif;
}

/** A 1×1 white uncompressed grayscale TIFF (baseline: the required tags, then the resolutions and the pixel). */
function createTiff(): Buffer {
  const SHORT = 3;
  const LONG = 4;
  const RATIONAL = 5;

  const entries: Array<[tag: number, type: number, value: number]> = [];
  const ifdSize = 2 + 12 * 12 + 4; // Entry count, 12 entries, next IFD offset
  const xResolutionOffset = 8 + ifdSize;
  const yResolutionOffset = xResolutionOffset + 8;
  const pixelOffset = yResolutionOffset + 8;

  entries.push(
    [256, SHORT, 1], // ImageWidth
    [257, SHORT, 1], // ImageLength
    [258, SHORT, 8], // BitsPerSample
    [259, SHORT, 1], // Compression: none
    [262, SHORT, 1], // PhotometricInterpretation: black is zero
    [273, LONG, pixelOffset], // StripOffsets
    [277, SHORT, 1], // SamplesPerPixel
    [278, SHORT, 1], // RowsPerStrip
    [279, LONG, 1], // StripByteCounts
    [282, RATIONAL, xResolutionOffset], // XResolution
    [283, RATIONAL, yResolutionOffset], // YResolution
    [296, SHORT, 2], // ResolutionUnit: inch
  );

  const tiff = Buffer.alloc(pixelOffset + 1);
  tiff.write('II', 0, 'ascii'); // Little-endian
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4); // Offset of the first IFD
  tiff.writeUInt16LE(entries.length, 8);
  entries.forEach(([tag, type, value], index) => {
    const offset = 10 + index * 12;
    tiff.writeUInt16LE(tag, offset);
    tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(1, offset + 4); // Count
    if (type === SHORT) tiff.writeUInt16LE(value, offset + 8);
    else tiff.writeUInt32LE(value, offset + 8);
  });
  // The next IFD offset stays 0; 72 dpi in both directions, then the white pixel
  tiff.writeUInt32LE(72, xResolutionOffset);
  tiff.writeUInt32LE(1, xResolutionOffset + 4);
  tiff.writeUInt32LE(72, yResolutionOffset);
  tiff.writeUInt32LE(1, yResolutionOffset + 4);
  tiff[pixelOffset] = 0xff;

  return tiff;
}

/** A 1×1 white 24-bit BMP: file header, info header, and one pixel row padded to 4 bytes. */
function createBmp(): Buffer {
  const bmp = Buffer.alloc(14 + 40 + 4);
  bmp.write('BM', 0, 'ascii');
  bmp.writeUInt32LE(bmp.length, 2); // File size
  bmp.writeUInt32LE(14 + 40, 10); // Offset of the pixels
  bmp.writeUInt32LE(40, 14); // Info header size
  bmp.writeInt32LE(1, 18); // Width
  bmp.writeInt32LE(1, 22); // Height
  bmp.writeUInt16LE(1, 26); // Planes
  bmp.writeUInt16LE(24, 28); // Bits per pixel
  bmp.writeUInt32LE(4, 34); // Image size
  bmp.writeInt32LE(2835, 38); // 72 dpi, in pixels per meter
  bmp.writeInt32LE(2835, 42);
  bmp.fill(0xff, 54, 57); // The pixel (blue, green, red)

  return bmp;
}

/** A 1×1 white 32-bit icon: the directory, then the image as a BMP without file header, plus its transparency mask. */
function createIco(): Buffer {
  const image = Buffer.alloc(40 + 4 + 4);
  image.writeUInt32LE(40, 0); // Info header size
  image.writeInt32LE(1, 4); // Width
  image.writeInt32LE(2, 8); // Height: doubled for the image and its mask
  image.writeUInt16LE(1, 12); // Planes
  image.writeUInt16LE(32, 14); // Bits per pixel
  image.writeUInt32LE(8, 20); // Image size: the pixel, and the mask row padded to 4 bytes
  image.fill(0xff, 40, 44); // The pixel (blue, green, red, alpha); the mask stays 0 (opaque)

  const directory = Buffer.alloc(6 + 16);
  directory.writeUInt16LE(1, 2); // Type: icon
  directory.writeUInt16LE(1, 4); // Image count
  directory[6] = 1; // Width
  directory[7] = 1; // Height
  directory.writeUInt16LE(1, 10); // Planes
  directory.writeUInt16LE(32, 12); // Bits per pixel
  directory.writeUInt32LE(image.length, 14);
  directory.writeUInt32LE(directory.length, 18); // Offset of the image

  return Buffer.concat([directory, image]);
}

/** A 1×1 white SVG. */
function createSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#fff"/></svg>\n';
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
  jpeg: createJpeg,
  png: createPng,
  gif: createGif,
  webp: createWebp,
  avif: createAvif,
  heic: () => createHeif('heic'),
  heif: () => createHeif('mif1'),
  tif: createTiff,
  tiff: createTiff,
  bmp: createBmp,
  svg: createSvg,
  ico: createIco,
  pdf: createPdf,
  docx: createDocx,
  txt: () => `${SAMPLE_TEXT}\n`,
  xlsx: createXlsx,
  csv: () => `id,name\n1,${SAMPLE_TEXT}\n`,
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
