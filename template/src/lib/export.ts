import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

// Экспорт и импорт таблиц: CSV, Excel (.xlsx), PDF. На телефоне файл
// сохраняется во временную папку и открывается окно «Поделиться»
// (почта, мессенджеры, «Файлы»); в браузере — обычное скачивание.

export type ExportColumn<T> = {
  title: string;
  value: (row: T) => string | number | Date | null | undefined;
  /** Числовая колонка: выравнивание вправо в PDF, число в Excel. */
  numeric?: boolean;
};

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

function matrix<T>(rows: T[], columns: ExportColumn<T>[]) {
  return rows.map((row) =>
    columns.map((c) => {
      const v = c.value(row);
      if (v instanceof Date) return v.toISOString();
      if (c.numeric && typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)))
        return Number(v);
      return v ?? '';
    })
  );
}

/** CSV с BOM — Excel сразу видит кириллицу; разделитель «;» удобен для русского Excel. */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[], delimiter = ';') {
  return (
    '\uFEFF' +
    Papa.unparse(
      { fields: columns.map((c) => c.title), data: matrix(rows, columns) },
      { delimiter }
    )
  );
}

/** Книга Excel в base64 (можно передать несколько листов). */
export function toXlsxBase64(sheets: { name: string; rows: unknown[][] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** HTML-отчёт для PDF: заголовок, подзаголовок и таблица. */
export function toHtmlReport<T>(
  title: string,
  rows: T[],
  columns: ExportColumn<T>[],
  subtitle = ''
) {
  const head = columns
    .map((c) => `<th${c.numeric ? ' class="n"' : ''}>${escapeHtml(c.title)}</th>`)
    .join('');
  const body = matrix(rows, columns)
    .map(
      (r) =>
        `<tr>${r.map((v, i) => `<td${columns[i].numeric ? ' class="n"' : ''}>${escapeHtml(String(v))}</td>`).join('')}</tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Arial,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 4px} p{color:#666;margin:0 0 16px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left}
    th{background:#f4f4f5} .n{text-align:right;font-variant-numeric:tabular-nums}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function downloadOnWeb(name: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBytes(b64: string) {
  const bin = globalThis.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function share(file: File, mime: string, title: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: title, UTI: undefined });
  }
}

/** Выгрузить строки в файл выбранного формата и отдать пользователю. */
export async function exportTable<T>(opts: {
  format: ExportFormat;
  fileName: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: ExportColumn<T>[];
}) {
  const { format, rows, columns, title } = opts;
  const name = `${opts.fileName}.${format}`;

  if (format === 'pdf') {
    const html = toHtmlReport(title, rows, columns, opts.subtitle);
    if (Platform.OS === 'web') return Print.printAsync({ html });
    const { uri } = await Print.printToFileAsync({ html });
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    new File(uri).move(file);
    return share(file, MIME.pdf, title);
  }

  if (format === 'csv') {
    const csv = toCsv(rows, columns);
    if (Platform.OS === 'web') return downloadOnWeb(name, csv, MIME.csv);
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    return share(file, MIME.csv, title);
  }

  const b64 = toXlsxBase64([
    { name: title, rows: [columns.map((c) => c.title), ...matrix(rows, columns)] },
  ]);
  const bytes = base64ToBytes(b64);
  if (Platform.OS === 'web') return downloadOnWeb(name, bytes, MIME.xlsx);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return share(file, MIME.xlsx, title);
}

/**
 * Выбрать CSV или Excel и прочитать в массив объектов по заголовкам первой строки.
 * Возвращает null, если пользователь отменил выбор.
 */
export async function importTable(): Promise<Record<string, string>[] | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', MIME.xlsx, 'application/vnd.ms-excel'],
    copyToCacheDirectory: true,
  });
  if (res.canceled) return null;
  const asset = res.assets[0];
  const isExcel = /\.xlsx?$/i.test(asset.name);

  const webFile = Platform.OS === 'web' ? asset.file : undefined;

  if (isExcel) {
    const bytes = webFile
      ? new Uint8Array(await webFile.arrayBuffer())
      : await new File(asset.uri).bytes();
    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' })
      .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])));
  }
  const text = (webFile ? await webFile.text() : await new File(asset.uri).text()).replace(
    /^\uFEFF/,
    ''
  );
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [';', ',', '\t'],
  });
  return parsed.data;
}
