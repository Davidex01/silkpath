import { api } from './client';

export interface FileMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string | null;
  createdAt: string;
}

/**
 * В прототипе у нас нет реального input[type=file] для документов,
 * поэтому создадим "виртуальный" файл через /files с пустым содержимым.
 * На бэке /files принимает UploadFile, так что для полноты это нужно будет
 * доработать бэкендеру. Сейчас будем считать, что у него есть способ
 * создать заглушечный File и вернуть FileMeta.
 *
 * Если это невозможно — этот модуль можно будет потом подправить.
 */
export async function createDummyFile(): Promise<FileMeta> {
  // Здесь оставляем заглушку, чтобы фронт был готов.
  // Бэкендер потом заменит на реальный upload через FormData и fetch.
  throw new Error('createDummyFile is a placeholder; backend must implement file upload.');
}