import { describe, expect, it, vi } from 'vitest';
import {
  createDraft,
  createDraftWriter,
  DraftConflict,
  loadDraft,
  saveDraft,
  upgradeDraft,
  listDrafts,
  listTrashedDrafts,
  moveDraftToTrash,
  restoreDraft,
  DraftInTrash,
} from './draft-store';
import type { LocalDraft } from './draft-store';

async function storeRaw(draft: LocalDraft) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('octopus-local-drafts', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

describe('local draft storage', () => {
  it('keeps the complete document in trash and restores it with a new revision', async () => {
    const initial = await createDraft();
    initial.document.content![0]!.attrs = {
      id: 'question-1',
      options: [
        {
          id: 'option-1',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Laut' }] }],
        },
      ],
      correctOptionId: 'option-1',
      optionSources: { 'option-1': { fallbackContent: [{ type: 'paragraph' }] } },
    };
    const saved = await saveDraft({ ...initial, title: 'Recover me' });
    await moveDraftToTrash(saved.id, saved.revision);
    expect(await loadDraft(saved.id)).toBeUndefined();
    expect((await listDrafts()).some((item) => item.id === saved.id)).toBe(false);
    const trashed = (await listTrashedDrafts()).find((item) => item.id === saved.id)!;
    expect(trashed.document).toEqual(saved.document);
    expect(trashed.createdAt).toBe(saved.createdAt);
    expect(trashed.deletedAt).toBeTruthy();
    await expect(saveDraft(saved)).rejects.toBeInstanceOf(DraftInTrash);
    await expect(saveDraft({ ...saved, revision: trashed.revision })).rejects.toBeInstanceOf(
      DraftInTrash,
    );
    await expect(restoreDraft(saved.id, saved.revision)).rejects.toBeInstanceOf(DraftConflict);
    await restoreDraft(saved.id, trashed.revision);
    const restored = (await loadDraft(saved.id))!;
    expect(restored.document).toEqual(saved.document);
    expect(restored.title).toBe(saved.title);
    expect(restored.revision).toBe(saved.revision + 2);
    expect(restored).not.toHaveProperty('deletedAt');
    await expect(saveDraft(saved)).rejects.toBeInstanceOf(DraftConflict);
    await expect(moveDraftToTrash(saved.id, saved.revision)).rejects.toBeInstanceOf(DraftConflict);
    expect((await listTrashedDrafts()).some((item) => item.id === saved.id)).toBe(false);
  });

  it('retains unsaved editor changes when another tab moves the draft to trash', async () => {
    const initial = await createDraft();
    const status = vi.fn();
    const writer = createDraftWriter(initial, status);
    await moveDraftToTrash(initial.id, initial.revision);
    writer.enqueue({ ...initial, title: 'Unsaved changes' });
    await vi.waitFor(() =>
      expect(status).toHaveBeenLastCalledWith('error', expect.any(DraftInTrash)),
    );
    expect(writer.hasPending()).toBe(true);
    expect(await loadDraft(initial.id)).toBeUndefined();
  });
  it('creates v2 records and migrates v1 in memory without writing until save', async () => {
    const initial = await createDraft();
    expect(initial.formatVersion).toBe(2);
    await storeRaw({ ...initial, formatVersion: 1 });
    const legacy = (await loadDraft(initial.id))!;
    const migrated = upgradeDraft(legacy);
    expect(migrated.formatVersion).toBe(2);
    expect(migrated.document).toEqual(legacy.document);
    expect(migrated.revision).toBe(legacy.revision);
    expect((await loadDraft(initial.id))!.formatVersion).toBe(1);
    const saved = await saveDraft(migrated);
    expect(saved.formatVersion).toBe(2);
    expect(saved.revision).toBe(initial.revision + 1);
    expect((await loadDraft(initial.id))!.formatVersion).not.toBe(1); // Legacy editor's guard rejects this.
  });

  it('does not overwrite a future format even when its revision matches', async () => {
    const initial = await createDraft();
    await storeRaw({ ...initial, formatVersion: 3 } as unknown as LocalDraft);
    await expect(saveDraft(initial)).rejects.toThrow('belum didukung');
    expect((await loadDraft(initial.id))!.formatVersion).toBe(3);
    expect(() => upgradeDraft({ ...initial, formatVersion: 3 } as unknown as LocalDraft)).toThrow();
  });
  it('persists the complete document and rejects stale revisions atomically', async () => {
    const initial = await createDraft();
    const saved = await saveDraft({ ...initial, title: 'First tab' });
    expect(saved.revision).toBe(initial.revision + 1);
    await expect(saveDraft({ ...initial, title: 'Stale tab' })).rejects.toBeInstanceOf(
      DraftConflict,
    );
    expect((await loadDraft(initial.id))?.title).toBe('First tab');
    expect((await loadDraft(initial.id))?.document).toEqual(initial.document);
  });

  it('serializes rapid edits and stores the latest snapshot', async () => {
    const initial = await createDraft();
    const onStatus = vi.fn();
    const writer = createDraftWriter(initial, onStatus);
    for (let index = 0; index < 20; index++)
      writer.enqueue({ ...initial, title: `Revision ${index}` });
    await vi.waitFor(() => expect(writer.hasPending()).toBe(false));
    expect((await loadDraft(initial.id))?.title).toBe('Revision 19');
    expect(onStatus).toHaveBeenLastCalledWith('saved');
  });
});
