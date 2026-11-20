import { describe, expect, it, vi } from 'vitest';
import { createDraft, createDraftWriter, DraftConflict, loadDraft, saveDraft } from './draft-store';

describe('local draft storage', () => {
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
