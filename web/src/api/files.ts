import { API_BASE } from './client';

export interface FileMeta {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    url?: string | null;
    createdAt: string;
}

/**
 * Создаёт "заглушечный" файл на бэке через /files.
 * Сейчас контент фиктивный (PDF с текстом), но этого достаточно,
 * чтобы Document ссылался на реальный fileId.
 */
export async function createDummyFile(): Promise<FileMeta> {
    const formData = new FormData();

    // Простейший Blob как PDF-заглушка
    const blob = new Blob(
        [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])], // "%PDF-1.4"
        { type: 'application/pdf' },
    );

    formData.append('file', blob, 'contract.pdf');

    const res = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        body: formData,          // ВАЖНО: НЕ выставляем Content-Type вручную
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `File upload failed with ${res.status}`);
    }

    return res.json() as Promise<FileMeta>;
}