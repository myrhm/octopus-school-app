import { backend } from '../../backend/client';
import { Editor, getSchema } from '@tiptap/core';
import { A, useBeforeLeave } from '@solidjs/router';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { questionExtensions } from './extensions';
import {
  mergeQuestion,
  questionAt,
  splitAtCursor,
  splitDelimiters,
  validateDocument,
  delimiterTextInput,
  addQuestion,
  cursorOnDelimiter,
} from './document';
import {
  createDraftWriter,
  DraftConflict,
  isSupportedDraftVersion,
  upgradeDraft,
} from './draft-store';
import type { LocalDraft } from './draft-store';
import { extractOptions } from './answer-options';
import AnswerOptionsPanel from './AnswerOptionsPanel';
import type { Transaction } from '@tiptap/pm/state';

export default function QuestionWorkspace(props: { draft: LocalDraft }) {
  let host!: HTMLDivElement;
  let writer: ReturnType<typeof createDraftWriter> | undefined;
  let draft: LocalDraft;
  const [editor, setEditor] = createSignal<Editor>();
  const [title, setTitle] = createSignal('');
  const [version, refresh] = createSignal(0);
  const [status, setStatus] = createSignal<'saved' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = createSignal('');
  const [conflict, setConflict] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [loadError, setLoadError] = createSignal('');

  const state = () => {
    version();
    return editor()?.state;
  };
  const active = () => {
    const value = state();
    return value ? questionAt(value) : null;
  };
  const count = () => state()?.doc.childCount ?? props.draft.questionCount;
  const hasUndo = () => {
    version();
    return editor()?.can().undo() ?? false;
  };
  const hasRedo = () => {
    version();
    return editor()?.can().redo() ?? false;
  };
  const canExtract = () => {
    const value = state();
    return Boolean(value && !value.selection.empty);
  };

  function applyOption(
    result: { transaction: Transaction } | { error: string },
    focusEditor = true,
  ) {
    if ('error' in result) {
      setMessage(result.error);
      return;
    }
    const instance = editor();
    if (!instance) return;
    instance.view.dispatch(result.transaction);
    if (focusEditor) instance.view.focus();
    setMessage('Pilihan jawaban diperbarui. Perubahan dapat diurungkan.');
  }

  function persist(instance = editor()) {
    if (!instance || !writer) return;
    draft = {
      ...draft,
      title: title(),
      document: instance.getJSON(),
      questionCount: instance.state.doc.childCount,
    };
    writer.enqueue(draft);
  }

  function transform(operation: 'split' | 'delimiter' | 'previous' | 'next') {
    const instance = editor();
    if (!instance) return;
    const result =
      operation === 'split'
        ? splitAtCursor(instance.state)
        : operation === 'delimiter'
          ? splitDelimiters(instance.state)
          : mergeQuestion(instance.state, operation);
    if ('error' in result) {
      setMessage(result.error);
      return;
    }
    instance.view.dispatch(result.transaction);
    instance.view.focus();
    setMessage(
      operation === 'delimiter'
        ? 'Soal dipisahkan. Gunakan Urungkan bila perlu.'
        : 'Struktur diperbarui. Semua perubahan dapat diurungkan.',
    );
  }

  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (writer?.hasPending()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  useBeforeLeave((event) => {
    if (
      writer?.hasPending() &&
      !window.confirm('Ada perubahan yang belum tersimpan. Tetap tinggalkan editor?')
    )
      event.preventDefault();
  });

  onMount(() => {
    draft = props.draft;
    setTitle(draft.title);
    if (!isSupportedDraftVersion(draft.formatVersion)) {
      setLoadError('Versi draft belum didukung. Salinan tersimpan tidak diubah.');
      return;
    }
    try {
      draft = upgradeDraft(draft);
      validateDocument(getSchema(questionExtensions()), draft.document);
      const instance = new Editor({
        element: host,
        extensions: questionExtensions(),
        content: draft.document,
        enableInputRules: false,
        editorProps: {
          handleDOMEvents: {
            keydown(view, event) {
              if (event.isComposing || event.key !== 'Enter') return false;
              const marker = cursorOnDelimiter(view.state);
              if (!(event.ctrlKey || event.metaKey || marker)) return false;
              event.preventDefault();
              transform('split');
              return true;
            },
          },
          handleTextInput(view, from, to, text) {
            if (view.composing) return false;
            const tr = delimiterTextInput(view.state, from, to, text);
            if (!tr) return false;
            view.dispatch(tr);
            setMessage('Soal baru dibuat. Lanjutkan mengetik di soal berikutnya.');
            return true;
          },
          attributes: {
            class: 'question-editor',
            role: 'textbox',
            'aria-label': 'Isi kumpulan soal',
            'aria-multiline': 'true',
            spellcheck: 'true',
          },
          handlePaste(_view, event) {
            if (
              event.clipboardData?.files.length ||
              /<img\b/i.test(event.clipboardData?.getData('text/html') ?? '')
            )
              setMessage(
                'Gambar belum didukung pada tahap ini. Teks yang tersedia tetap ditempelkan; tambahkan media pada tahap berikutnya.',
              );
            return false;
          },
        },
        onTransaction: () => refresh((value) => value + 1),
        onUpdate: ({ editor: updated }) => persist(updated),
      });
      writer = createDraftWriter(draft, (next, error) => {
        setStatus(next);
        setSaveError(error?.message ?? '');
        setConflict(error instanceof DraftConflict);
      });
      setEditor(instance);
    } catch {
      setLoadError('Isi draft tidak dapat dibuka. Data tersimpan tidak diubah.');
    }
    window.addEventListener('beforeunload', beforeUnload);
  });
  onCleanup(() => {
    editor()?.destroy();
    window.removeEventListener('beforeunload', beforeUnload);
  });

  function download() {
    const instance = editor();
    const snapshot = instance
      ? {
          ...draft,
          title: title(),
          document: instance.getJSON(),
          questionCount: instance.state.doc.childCount,
        }
      : props.draft;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `octopus-draft-${snapshot.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section class="page import-page" aria-labelledby="page-title">
      <A class="text-link" href="/bank-soal">
        Kembali ke bank soal
      </A>
      <div class="page-heading">
        <div>
          <p class="eyebrow">IMPOR SOAL LOKAL</p>
          <h1 id="page-title">Susun kumpulan soal</h1>
          <p class="intro">
            Tempel dokumen Anda, lalu rapikan batas antarsoal tanpa menyalin ulang.
          </p>
        </div>
        <Badge tone="info">{backend ? 'Draft sekolah' : 'Hanya di browser ini'}</Badge>
      </div>
      <div class="local-draft-note">
        <p>
          Draft tersimpan pada browser dan perangkat ini. Menghapus data browser dapat menghapus
          draft. Unduh salinan untuk cadangan.
        </p>
        <Button variant="secondary" onClick={download}>
          Unduh salinan draft
        </Button>
      </div>
      <Show
        when={!loadError()}
        fallback={
          <p class="field-error" role="alert">
            {loadError()}
          </p>
        }
      >
        <label class="field import-title">
          <span class="field-label">Nama draft</span>
          <input
            class="text-input"
            value={title()}
            maxlength={160}
            onInput={(event) => {
              setTitle(event.currentTarget.value);
              persist();
            }}
          />
        </label>
        <div class="import-meta">
          <span>
            {count()} soal · Soal aktif {active() ? active()!.index + 1 : '—'}
          </span>
          <span role="status" aria-live="polite">
            {status() === 'saved'
              ? backend
                ? 'Tersimpan di sekolah'
                : 'Tersimpan di browser ini'
              : status() === 'saving'
                ? 'Menyimpan draft…'
                : 'Draft belum tersimpan'}
          </span>
        </div>
        <Show when={saveError()}>
          <div class="save-error" role="alert">
            <p>{saveError()}</p>
            <Show when={!conflict()}>
              <Button variant="secondary" onClick={() => writer?.retry()}>
                Coba simpan lagi
              </Button>
            </Show>
          </div>
        </Show>
        <div class="import-toolbar" role="group" aria-label="Alat penyusunan soal">
          <Button
            onClick={() => {
              const instance = editor();
              if (!instance) return;
              instance.view.dispatch(addQuestion(instance.state));
              instance.view.focus();
              setMessage('Soal baru dibuat. Lanjutkan mengetik di sini.');
            }}
            disabled={!editor()}
          >
            Tambah soal
          </Button>
          <Button variant="secondary" onClick={() => transform('split')} disabled={!editor()}>
            Pisahkan di kursor
          </Button>
          <Button variant="secondary" onClick={() => transform('delimiter')} disabled={!editor()}>
            Pisahkan dengan %%%
          </Button>
          <Button
            variant="ghost"
            onClick={() => transform('previous')}
            disabled={!active() || active()!.index === 0}
          >
            Gabung sebelumnya
          </Button>
          <Button
            variant="ghost"
            onClick={() => transform('next')}
            disabled={!active() || active()!.index + 1 >= count()}
          >
            Gabung berikutnya
          </Button>
          <Button
            variant="secondary"
            onClick={() => editor()?.chain().focus().undo().run()}
            disabled={!hasUndo()}
          >
            Urungkan
          </Button>
          <Button
            variant="secondary"
            onClick={() => editor()?.chain().focus().redo().run()}
            disabled={!hasRedo()}
          >
            Ulangi
          </Button>
        </div>
        <div class="format-toolbar" role="group" aria-label="Format teks">
          <Button
            variant="ghost"
            aria-label="Tebal"
            aria-pressed={(() => {
              version();
              return editor()?.isActive('bold') ?? false;
            })()}
            onClick={() => editor()?.chain().focus().toggleBold().run()}
          >
            B
          </Button>
          <Button
            variant="ghost"
            aria-label="Miring"
            aria-pressed={(() => {
              version();
              return editor()?.isActive('italic') ?? false;
            })()}
            onClick={() => editor()?.chain().focus().toggleItalic().run()}
          >
            I
          </Button>
          <Button
            variant="ghost"
            aria-label="Garis bawah"
            aria-pressed={(() => {
              version();
              return editor()?.isActive('underline') ?? false;
            })()}
            onClick={() => editor()?.chain().focus().toggleUnderline().run()}
          >
            U
          </Button>
          <Button
            variant="ghost"
            onClick={() => editor()?.chain().focus().toggleBulletList().run()}
          >
            Daftar poin
          </Button>
        </div>
        <div class="option-extraction-toolbar" role="group" aria-label="Ekstraksi pilihan jawaban">
          <Button
            variant="secondary"
            disabled={!canExtract()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const instance = editor();
              if (instance) applyOption(extractOptions(instance.state));
            }}
          >
            Jadikan opsi
          </Button>
          <Button
            variant="secondary"
            disabled={!canExtract()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const instance = editor();
              if (instance) applyOption(extractOptions(instance.state, true));
            }}
          >
            Ekstrak beberapa opsi
          </Button>
          <span class="field-hint">
            Seleksi teks jawaban di dalam satu soal. Label A/B/C mengikuti urutan opsi.
          </span>
        </div>
        <p class="field-hint import-help">
          Ctrl/Cmd + Enter langsung membuat soal berikutnya, termasuk di akhir teks. Ketik %%% pada
          baris tersendiri untuk langsung membuka soal baru. Untuk dokumen yang ditempel, gunakan
          Pisahkan dengan %%%. Soal kosong boleh dilengkapi nanti.
        </p>
        <p class="import-feedback" role="status" aria-live="polite">
          {message()}
        </p>
        <div class="import-editing-layout">
          <div ref={host} />
          <AnswerOptionsPanel state={state} apply={applyOption} />
        </div>
      </Show>
    </section>
  );
}
