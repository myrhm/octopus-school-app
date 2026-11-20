import type { JSONContent } from '@tiptap/core';
import { emptyDocument } from './document';

export interface LocalDraft {
  id: string;
  formatVersion: 1 | 2;
  title: string;
  document: JSONContent;
  questionCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export const currentDraftFormatVersion = 2 as const;
export function isSupportedDraftVersion(version: unknown): version is LocalDraft['formatVersion'] {
  return version === 1 || version === currentDraftFormatVersion;
}

/** Read-only migration; preserve the stored revision and content until the next save. */
export function upgradeDraft(draft: LocalDraft): LocalDraft {
  if (!isSupportedDraftVersion(draft.formatVersion)) throw new Error('Versi draft belum didukung.');
  return { ...draft, formatVersion: currentDraftFormatVersion };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('octopus-local-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Penyimpanan browser tidak dapat dibuka.'));
    request.onblocked = () => reject(new Error('Tutup tab Octopus lain lalu coba lagi.'));
  });
}

export async function listDrafts(): Promise<LocalDraft[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').getAll();
      tx.oncomplete = () =>
        resolve(
          (request.result as LocalDraft[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      tx.onabort = tx.onerror = () => reject(new Error('Daftar draft tidak dapat dibaca.'));
    });
  } finally {
    db.close();
  }
}

export async function loadDraft(id: string): Promise<LocalDraft | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get(id);
      tx.oncomplete = () => resolve(request.result as LocalDraft | undefined);
      tx.onabort = tx.onerror = () => reject(new Error('Draft tidak dapat dibaca.'));
    });
  } finally {
    db.close();
  }
}

export class DraftConflict extends Error {
  constructor() {
    super('Draft berubah di tab lain. Unduh salinan perubahan Anda sebelum membuka ulang draft.');
  }
}

export async function saveDraft(draft: LocalDraft): Promise<LocalDraft> {
  const upgraded = upgradeDraft(draft);
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const existing = store.get(draft.id);
      let conflict = false;
      let unsupported = false;
      const saved = {
        ...upgraded,
        revision: draft.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      existing.onsuccess = () => {
        const previous = existing.result as LocalDraft | undefined;
        if (previous && !isSupportedDraftVersion(previous.formatVersion)) {
          unsupported = true;
          tx.abort();
          return;
        }
        if ((previous?.revision ?? 0) !== draft.revision) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put(saved);
      };
      tx.oncomplete = () => resolve(saved);
      tx.onabort = tx.onerror = () =>
        reject(
          unsupported
            ? new Error('Versi draft tersimpan belum didukung. Data tidak diubah.')
            : conflict
              ? new DraftConflict()
              : new Error('Draft belum tersimpan. Coba lagi atau unduh salinannya.'),
        );
    });
  } finally {
    db.close();
  }
}

export async function createDraft() {
  const now = new Date().toISOString();
  return saveDraft({
    id: crypto.randomUUID(),
    formatVersion: currentDraftFormatVersion,
    title: 'Impor soal baru',
    document: emptyDocument(),
    questionCount: 1,
    revision: 0,
    createdAt: now,
    updatedAt: now,
  });
}

// One writer per open draft serializes saves and coalesces rapid edits.
export function createDraftWriter(
  initial: LocalDraft,
  onStatus: (state: 'saved' | 'saving' | 'error', error?: Error) => void,
) {
  let current = initial;
  let pending: LocalDraft | undefined;
  let running = false;
  let failed = false;
  async function flush() {
    if (running || !pending || failed) return;
    running = true;
    onStatus('saving');
    try {
      while (pending) {
        const snapshot = pending;
        pending = undefined;
        try {
          current = await saveDraft({ ...snapshot, revision: current.revision });
        } catch (error) {
          pending ??= snapshot;
          throw error;
        }
      }
      onStatus('saved');
    } catch (error) {
      failed = true;
      onStatus('error', error instanceof Error ? error : new Error('Draft belum tersimpan.'));
    } finally {
      running = false;
    }
  }
  return {
    enqueue(draft: LocalDraft) {
      pending = structuredClone(draft);
      void flush();
    },
    retry() {
      failed = false;
      void flush();
    },
    hasPending() {
      return running || Boolean(pending);
    },
  };
}
