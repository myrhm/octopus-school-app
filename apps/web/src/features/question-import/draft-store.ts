import { backend, call, school } from '../../backend/client';
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

/** Tombstones use a version rejected by older editors, which otherwise ignore deletion metadata. */
export interface TrashedDraft extends Omit<LocalDraft, 'formatVersion'> {
  formatVersion: 3;
  deletedAt: string;
  originalFormatVersion: LocalDraft['formatVersion'];
}
type StoredDraft = LocalDraft | TrashedDraft;
function isTrashed(draft: StoredDraft): draft is TrashedDraft {
  return draft.formatVersion === 3 && 'deletedAt' in draft && typeof draft.deletedAt === 'string';
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

export async function listLocalRecords(): Promise<StoredDraft[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').getAll();
      tx.oncomplete = () =>
        resolve(
          (request.result as StoredDraft[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      tx.onabort = tx.onerror = () => reject(new Error('Daftar draft tidak dapat dibaca.'));
    });
  } finally {
    db.close();
  }
}

async function listRecords(): Promise<StoredDraft[]> {
  if (!backend) return listLocalRecords();
  return (await call<StoredDraft[]>('drafts')).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
async function writeRemote(record: StoredDraft, expected: number, schoolId: string) {
  try {
    await call('save', { record, expected, school: schoolId });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 409) throw new DraftConflict();
    throw error;
  }
}

export async function importLocalRecord(record: StoredDraft) {
  await writeRemote({ ...record, revision: 1 }, 0, school());
}

export async function listDrafts(): Promise<LocalDraft[]> {
  return (await listRecords()).filter((draft): draft is LocalDraft => !isTrashed(draft));
}

export async function listTrashedDrafts(): Promise<TrashedDraft[]> {
  return (await listRecords()).filter(isTrashed);
}

async function loadRecord(id: string): Promise<StoredDraft | undefined> {
  if (backend) {
    return (await call<StoredDraft | null>('draft', { id })) ?? undefined;
  }
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const request = tx.objectStore('drafts').get(id);
      tx.oncomplete = () => resolve(request.result as StoredDraft | undefined);
      tx.onabort = tx.onerror = () => reject(new Error('Draft tidak dapat dibaca.'));
    });
  } finally {
    db.close();
  }
}

export async function loadDraft(id: string): Promise<LocalDraft | undefined> {
  const draft = await loadRecord(id);
  return draft && !isTrashed(draft) ? draft : undefined;
}

export class DraftConflict extends Error {
  constructor(
    message = 'Draft berubah di tab lain. Unduh salinan perubahan Anda sebelum membuka ulang draft.',
  ) {
    super(message);
  }
}

export class DraftInTrash extends DraftConflict {
  constructor() {
    super(
      'Draft sudah dipindahkan ke Sampah. Perubahan tab ini belum tersimpan. Unduh salinannya atau pulihkan draft dari Bank soal, lalu buka ulang.',
    );
  }
}

async function changeTrashState(id: string, revision: number, restore: boolean): Promise<void> {
  if (backend) {
    const schoolId = school();
    const record = await loadRecord(id);
    if (!record || record.revision !== revision || restore !== isTrashed(record))
      throw new DraftConflict();
    const updatedAt = new Date().toISOString();
    if (isTrashed(record)) {
      const { originalFormatVersion, deletedAt, ...draft } = record;
      if (!deletedAt) throw new DraftConflict();
      await writeRemote(
        {
          ...upgradeDraft({ ...draft, formatVersion: originalFormatVersion }),
          revision: revision + 1,
          updatedAt,
        },
        revision,
        schoolId,
      );
    } else {
      const draft = upgradeDraft(record);
      await writeRemote(
        {
          ...draft,
          formatVersion: 3,
          originalFormatVersion: draft.formatVersion,
          deletedAt: updatedAt,
          updatedAt,
          revision: revision + 1,
        },
        revision,
        schoolId,
      );
    }
    return;
  }
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const request = store.get(id);
      let failure: Error | undefined;
      request.onsuccess = () => {
        const previous = request.result as StoredDraft | undefined;
        if (!previous) failure = new Error('Draft tidak ditemukan. Muat ulang daftar.');
        else if (previous.revision !== revision)
          failure = new DraftConflict(
            'Draft berubah di tab lain. Muat ulang daftar sebelum mencoba lagi.',
          );
        else if (restore && !isTrashed(previous))
          failure = new Error('Draft ini sudah berada di daftar aktif.');
        else if (!restore && isTrashed(previous)) failure = new DraftInTrash();
        else if (restore && isTrashed(previous)) {
          if (!isSupportedDraftVersion(previous.originalFormatVersion))
            failure = new Error('Versi draft belum didukung. Data tidak diubah.');
          else {
            store.put({
              id: previous.id,
              title: previous.title,
              document: previous.document,
              questionCount: previous.questionCount,
              createdAt: previous.createdAt,
              formatVersion: currentDraftFormatVersion,
              revision: revision + 1,
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (!isSupportedDraftVersion(previous.formatVersion))
          failure = new Error('Versi draft belum didukung. Data tidak diubah.');
        else {
          const now = new Date().toISOString();
          store.put({
            ...previous,
            formatVersion: 3,
            originalFormatVersion: previous.formatVersion,
            deletedAt: now,
            revision: revision + 1,
            updatedAt: now,
          });
        }
        if (failure) tx.abort();
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(failure ?? new Error('Perubahan belum tersimpan. Coba lagi.'));
    });
  } finally {
    db.close();
  }
}

export function moveDraftToTrash(id: string, revision: number) {
  return changeTrashState(id, revision, false);
}
export function restoreDraft(id: string, revision: number) {
  return changeTrashState(id, revision, true);
}

export async function saveDraft(draft: LocalDraft): Promise<LocalDraft> {
  const upgraded = upgradeDraft(draft);
  if (backend) {
    const saved = {
      ...upgraded,
      revision: draft.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    await writeRemote(saved, draft.revision, school());
    return saved;
  }
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const existing = store.get(draft.id);
      let conflict = false;
      let unsupported = false;
      let trashed = false;
      const saved = {
        ...upgraded,
        revision: draft.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      existing.onsuccess = () => {
        const previous = existing.result as StoredDraft | undefined;
        if (previous && isTrashed(previous)) {
          trashed = true;
          tx.abort();
          return;
        }
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
          trashed
            ? new DraftInTrash()
            : unsupported
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
