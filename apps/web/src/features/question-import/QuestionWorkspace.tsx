import { uploadMedia } from '../../backend/media';
import { backend } from '../../backend/client';
import { Editor, getSchema } from '@tiptap/core';
import { A, useBeforeLeave } from '@solidjs/router';
import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import CircleAlert from 'lucide-solid/icons/info';
import CircleCheck from 'lucide-solid/icons/circle-check';
import Pin from 'lucide-solid/icons/pin';
import PinOff from 'lucide-solid/icons/pin-off';
import Undo2 from 'lucide-solid/icons/undo-2';
import Redo2 from 'lucide-solid/icons/redo-2';
import Plus from 'lucide-solid/icons/plus';
import SlidersHorizontal from 'lucide-solid/icons/sliders-horizontal';
import X from 'lucide-solid/icons/x';
import { Dialog } from '@kobalte/core/dialog';
import { render } from 'solid-js/web';
import Scissors from 'lucide-solid/icons/scissors';
import TextSelect from 'lucide-solid/icons/lasso-select';
import ListPlus from 'lucide-solid/icons/list-plus';
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
  const shortcutModifier = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
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
  const [optionFeedback, setOptionFeedback] = createSignal<{
    phase: 'error' | 'success';
    text: string;
  }>();
  let optionFeedbackElement: HTMLDivElement | undefined;
  const [loadError, setLoadError] = createSignal('');
  const [commandMenuOpen, setCommandMenuOpen] = createSignal(false);
  const commands = [
    {
      key: 's',
      label: 'Jadikan satu opsi',
      description: 'Pindahkan teks yang diseleksi menjadi satu pilihan jawaban.',
      disabled: () => !canExtract(),
      run: () => extractSelection(),
    },
    {
      key: 'd',
      label: 'Ekstrak beberapa opsi',
      description: 'Pisahkan baris A/B/C atau tanda - menjadi beberapa pilihan.',
      disabled: () => !canExtract(),
      run: () => extractSelection(true),
    },
    {
      key: 'p',
      label: 'Pisahkan di kursor',
      description: 'Buat batas soal pada posisi kursor.',
      disabled: () => !editor(),
      run: () => transform('split'),
    },
    {
      key: 'n',
      label: 'Tambah soal',
      description: 'Buat soal baru dan lanjutkan mengetik.',
      disabled: () => !editor(),
      run: () => addNewQuestion(),
    },
    {
      key: 'b',
      label: 'Tebal',
      description: 'Tebalkan teks yang dipilih.',
      disabled: () => !editor(),
      run: () => editor()?.chain().focus().toggleBold().run(),
    },
    {
      key: 'i',
      label: 'Miring',
      description: 'Miringkan teks yang dipilih.',
      disabled: () => !editor(),
      run: () => editor()?.chain().focus().toggleItalic().run(),
    },
    {
      key: 'u',
      label: 'Garis bawah',
      description: 'Beri garis bawah pada teks yang dipilih.',
      disabled: () => !editor(),
      run: () => editor()?.chain().focus().toggleUnderline().run(),
    },
  ];
  function runCommand(key: string) {
    const command = commands.find((item) => item.key === key);
    if (!command || command.disabled()) return;
    setCommandMenuOpen(false);
    command.run();
  }
  const [toolsPinned, setToolsPinned] = createSignal(false);
  const [toolsAboveViewport, setToolsAboveViewport] = createSignal(false);
  let toolsSentinel: HTMLDivElement | undefined;
  let pinnedMenu: HTMLDetailsElement | undefined;
  let imageSettings: HTMLDetailsElement | undefined;
  let questionSettings: HTMLDetailsElement | undefined;

  function toggleToolsPin() {
    const next = !toolsPinned();
    setToolsPinned(next);
    try {
      localStorage.setItem('octopus-editor-tools-pinned', String(next));
    } catch {
      /* Pinning still works when storage is unavailable. */
    }
  }
  function addNewQuestion() {
    const instance = editor();
    if (!instance) return;
    instance.view.dispatch(addQuestion(instance.state));
    instance.view.focus();
    setMessage('Soal baru dibuat. Lanjutkan mengetik di sini.');
  }
  onMount(() => {
    try {
      setToolsPinned(localStorage.getItem('octopus-editor-tools-pinned') === 'true');
    } catch {
      /* Use the unpinned default. */
    }
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(
            ([entry]) => {
              if (entry)
                setToolsAboveViewport(!entry.isIntersecting && entry.boundingClientRect.top < 8);
            },
            { rootMargin: '-8px 0px 0px 0px' },
          );
    if (toolsSentinel) observer?.observe(toolsSentinel);
    const closeMenu = (event: PointerEvent) => {
      if (pinnedMenu && event.target instanceof Node && !pinnedMenu.contains(event.target))
        pinnedMenu.open = false;
    };
    document.addEventListener('pointerdown', closeMenu);
    onCleanup(() => {
      observer?.disconnect();
      document.removeEventListener('pointerdown', closeMenu);
    });
  });

  let imageWidth!: HTMLInputElement;
  let imageDescription!: HTMLInputElement;
  const [uploading, setUploading] = createSignal(false);
  async function insertImage(file: File) {
    const instance = editor();
    if (!instance || uploading()) return;
    const alt = imageDescription.value.trim() || file.name;
    if (!alt) {
      setMessage('Isi deskripsi gambar terlebih dahulu.');
      imageDescription.focus();
      return;
    }
    setUploading(true);
    setMessage('Mengompres dan mengunggah gambar…');
    try {
      const fileId = await uploadMedia(file);
      if (instance.isDestroyed) return;
      instance
        .chain()
        .focus()
        .insertContent({
          type: 'schoolImage',
          attrs: {
            fileId,
            alt,
            width: Math.min(960, Math.max(64, Number(imageWidth.value) || 320)),
          },
        })
        .run();
      setMessage('Gambar disisipkan.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Gambar gagal disisipkan. Periksa koneksi dan coba lagi.',
      );
    } finally {
      setUploading(false);
    }
  }
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

  function changeQuestion(key: string, value: unknown) {
    const instance = editor(),
      q = active();
    if (instance && q)
      instance.view.dispatch(
        instance.state.tr.setNodeMarkup(q.start, undefined, { ...q.node.attrs, [key]: value }),
      );
  }
  function showOptionError(text: string) {
    setOptionFeedback({ phase: 'error', text });
    setMessage('');
    queueMicrotask(() => optionFeedbackElement?.scrollIntoView({ block: 'nearest' }));
  }
  function extractSelection(multiple = false) {
    const instance = editor();
    if (!instance) return;
    let result: ReturnType<typeof extractOptions>;
    try {
      result = extractOptions(instance.state, multiple);
    } catch {
      showOptionError(
        'Bagian teks ini belum dapat diubah menjadi opsi. Seleksi ulang hanya isi jawaban di dalam satu soal, lalu coba lagi.',
      );
      return;
    }
    applyOption(result);
  }
  function applyOption(
    result: { transaction: Transaction } | { error: string },
    focusEditor = true,
  ) {
    if ('error' in result) {
      showOptionError(result.error);
      return;
    }
    const instance = editor();
    if (!instance || instance.isDestroyed) return;
    instance.view.dispatch(result.transaction);
    if (focusEditor) instance.view.focus();
    setOptionFeedback({
      phase: 'success',
      text: 'Periksa urutan dan kunci di panel Pilihan jawaban. Gunakan Urungkan jika ingin membatalkan perubahan.',
    });
    setMessage('');
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

  function transform(operation: 'split' | 'previous' | 'next') {
    const instance = editor();
    if (!instance) return;
    const result =
      operation === 'split'
        ? splitAtCursor(instance.state)
        : mergeQuestion(instance.state, operation);
    if ('error' in result) {
      setMessage(result.error);
      return;
    }
    instance.view.dispatch(result.transaction);
    instance.view.focus();
    setMessage('Struktur diperbarui. Semua perubahan dapat diurungkan.');
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
        extensions: questionExtensions((host, questionId) =>
          render(
            () => <AnswerOptionsPanel questionId={questionId} state={state} apply={applyOption} />,
            host,
          ),
        ),
        content: draft.document,
        enableInputRules: false,
        editorProps: {
          handleDOMEvents: {
            keydown(view, event) {
              if (event.isComposing) return false;
              if (
                (event.ctrlKey || event.metaKey) &&
                !event.shiftKey &&
                !event.altKey &&
                event.key.toLowerCase() === 'k'
              ) {
                event.preventDefault();
                setCommandMenuOpen(true);
                return true;
              }
              if (event.key !== 'Enter') return false;
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
          handleDrop(view, event, _slice, moved) {
            const file = event.dataTransfer?.files[0];
            if (!backend || moved || !file?.type.startsWith('image/')) return false;
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (pos) editor()?.commands.setTextSelection(pos.pos);
            void insertImage(file);
            return true;
          },
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (/(?:^|\n)\s*%%%\s*(?:\n|$)/.test(text)) {
              const instance = editor();
              queueMicrotask(() => {
                if (!instance || instance.isDestroyed) return;
                const result = splitDelimiters(instance.state);
                if ('transaction' in result) instance.view.dispatch(result.transaction);
              });
            }
            const image = event.clipboardData?.files[0];
            if (backend && image?.type.startsWith('image/')) {
              void insertImage(image);
              return !event.clipboardData?.getData('text/plain');
            }
            if (
              event.clipboardData?.files.length ||
              /<img\b/i.test(event.clipboardData?.getData('text/html') ?? '')
            )
              setMessage(
                'Gambar dari dokumen ini belum dapat ditempelkan. Teks yang tersedia tetap dipertahankan.',
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
          <p class="eyebrow">{backend ? 'DRAFT SEKOLAH' : 'IMPOR SOAL LOKAL'}</p>
          <h1 id="page-title">Susun kumpulan soal</h1>
          <p class="intro">
            Tempel dokumen Anda, lalu rapikan batas antarsoal tanpa menyalin ulang.
          </p>
        </div>
        <Badge tone="info">{backend ? 'Draft sekolah' : 'Hanya di browser ini'}</Badge>
      </div>
      <div class="local-draft-note">
        <p>
          {backend
            ? 'Draft tersimpan di sekolah aktif. Unduh salinan untuk menyimpan cadangan di perangkat ini.'
            : 'Draft tersimpan pada browser dan perangkat ini. Menghapus data browser dapat menghapus draft. Unduh salinan untuk cadangan.'}
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
        <div ref={toolsSentinel} class="editor-tools-sentinel" aria-hidden="true" />
        <div class="editor-dock-anchor">
          <Show when={toolsPinned() && toolsAboveViewport()}>
            <div class="editor-dock" role="group" aria-label="Alat soal disematkan">
              <div class="editor-dock-context">
                <strong>Susun soal</strong>
                <span>
                  {active() ? 'Soal ' + (active()!.index + 1) + '/' + count() : count() + ' soal'}
                </span>
              </div>
              <div
                class="dock-quick-actions"
                role="group"
                aria-label="Pisahkan soal dan ekstrak jawaban"
              >
                <Button
                  variant="secondary"
                  aria-label="Pisahkan di kursor"
                  title="Pisahkan di kursor"
                  disabled={!editor()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => transform('split')}
                >
                  <Scissors size={18} aria-hidden="true" />
                  <span class="dock-quick-label">Pisahkan di kursor</span>
                </Button>
                <Button
                  variant="secondary"
                  aria-label="Jadikan opsi"
                  title="Jadikan opsi"
                  disabled={!canExtract()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => extractSelection()}
                >
                  <TextSelect size={18} aria-hidden="true" />
                  <span class="dock-quick-label">Jadikan opsi</span>
                </Button>
                <Button
                  variant="secondary"
                  aria-label="Ekstrak beberapa opsi"
                  title="Ekstrak beberapa opsi"
                  disabled={!canExtract()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => extractSelection(true)}
                >
                  <ListPlus size={18} aria-hidden="true" />
                  <span class="dock-quick-label">Ekstrak beberapa opsi</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                class="dock-icon dock-history"
                aria-label="Urungkan"
                title="Urungkan"
                disabled={!hasUndo()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor()?.chain().focus().undo().run()}
              >
                <Undo2 size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                class="dock-icon dock-history"
                aria-label="Ulangi"
                title="Ulangi"
                disabled={!hasRedo()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor()?.chain().focus().redo().run()}
              >
                <Redo2 size={18} aria-hidden="true" />
              </Button>
              <details
                class="dock-tools"
                ref={pinnedMenu}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector('summary')?.focus();
                    event.stopPropagation();
                  }
                }}
              >
                <summary
                  class="button"
                  data-variant="secondary"
                  aria-label="Buka alat dan penilaian soal"
                  title="Alat dan penilaian soal"
                >
                  <SlidersHorizontal size={18} aria-hidden="true" />
                  <span class="dock-action-label">Alat soal</span>
                </summary>
                <div class="dock-popover">
                  <strong>Soal aktif {active() ? active()!.index + 1 : '—'}</strong>
                  <div class="dock-format-actions" role="group" aria-label="Format teks ringkas">
                    <Button
                      variant="ghost"
                      aria-label="Urungkan"
                      title="Urungkan"
                      disabled={!hasUndo()}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => editor()?.chain().focus().undo().run()}
                    >
                      <Undo2 size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Ulangi"
                      title="Ulangi"
                      disabled={!hasRedo()}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => editor()?.chain().focus().redo().run()}
                    >
                      <Redo2 size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Tebal"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor()?.chain().focus().toggleBold().run()}
                    >
                      B
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Miring"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor()?.chain().focus().toggleItalic().run()}
                    >
                      I
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Garis bawah"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor()?.chain().focus().toggleUnderline().run()}
                    >
                      U
                    </Button>
                    <Button
                      variant="ghost"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor()?.chain().focus().toggleBulletList().run()}
                    >
                      Daftar poin
                    </Button>
                  </div>
                  <div class="field">
                    <label class="field-label" for="dock-question-kind">
                      Jenis soal
                    </label>
                    <select
                      id="dock-question-kind"
                      class="text-input"
                      value={active()?.node.attrs.kind}
                      disabled={!active()}
                      onChange={(e) => changeQuestion('kind', e.currentTarget.value)}
                    >
                      <option value="single">Pilihan tunggal</option>
                      <option value="multiple">Pilihan jamak</option>
                      <option value="short">Jawaban singkat</option>
                      <option value="essay">Esai</option>
                    </select>
                  </div>
                  <label class="field">
                    <span class="field-label">Bobot</span>
                    <input
                      class="text-input"
                      type="number"
                      min="1"
                      max="100"
                      value={active()?.node.attrs.weight}
                      disabled={!active()}
                      onChange={(e) => changeQuestion('weight', Number(e.currentTarget.value))}
                    />
                  </label>
                  <div class="dock-extra-actions">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (pinnedMenu) pinnedMenu.open = false;
                        if (questionSettings) {
                          questionSettings.open = true;
                          questionSettings.scrollIntoView({ block: 'start' });
                        }
                      }}
                    >
                      Pengaturan lengkap
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!active() || active()!.index === 0}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => transform('previous')}
                    >
                      Gabung sebelumnya
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!active() || active()!.index + 1 >= count()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => transform('next')}
                    >
                      Gabung berikutnya
                    </Button>
                    <Show when={backend}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (pinnedMenu) pinnedMenu.open = false;
                          if (imageSettings) {
                            imageSettings.open = true;
                            imageSettings.scrollIntoView({ block: 'start' });
                          }
                        }}
                      >
                        Sisipkan gambar
                      </Button>
                    </Show>
                  </div>
                  <p class="field-hint">
                    Seleksi jawaban, lalu tekan {shortcutModifier} + K untuk membuka menu tindakan.
                  </p>
                </div>
              </details>
              <Button
                class="dock-add"
                aria-label="Tambah soal"
                title="Tambah soal"
                disabled={!editor()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={addNewQuestion}
              >
                <Plus size={18} aria-hidden="true" />
                <span class="dock-action-label">Tambah soal</span>
              </Button>
              <Button
                variant="ghost"
                class="dock-icon"
                aria-label="Lepas sematan alat"
                title="Lepas sematan alat"
                aria-pressed="true"
                onClick={toggleToolsPin}
              >
                <PinOff size={18} aria-hidden="true" />
              </Button>
            </div>
          </Show>
        </div>
        <div class="import-toolbar" role="group" aria-label="Alat penyusunan soal">
          <Button onClick={addNewQuestion} disabled={!editor()}>
            Tambah soal
          </Button>
          <Button variant="secondary" onClick={() => transform('split')} disabled={!editor()}>
            Pisahkan di kursor
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
          <Button
            variant="ghost"
            class="editor-pin-button"
            aria-label={toolsPinned() ? 'Lepas sematan alat' : 'Sematkan alat saat menggulir'}
            title={toolsPinned() ? 'Lepas sematan alat' : 'Sematkan alat saat menggulir'}
            aria-pressed={toolsPinned()}
            onClick={toggleToolsPin}
          >
            <Show when={toolsPinned()} fallback={<Pin size={18} aria-hidden="true" />}>
              <PinOff size={18} aria-hidden="true" />
            </Show>
          </Button>
        </div>
        <Show when={backend}>
          <details class="editor-settings" ref={imageSettings}>
            <summary>Sisipkan gambar</summary>
            <div class="editor-settings-body">
              <p class="field-hint settings-full-width">
                Unggah gambar untuk soal aktif, atau pilih gambar di editor untuk mengubah deskripsi
                dan ukurannya.
              </p>
              <label class="field">
                <span class="field-label">Deskripsi gambar</span>
                <input class="text-input" ref={imageDescription} maxlength={250} />
              </label>
              <label class="field">
                <span class="field-label">Lebar gambar (piksel)</span>
                <input
                  class="text-input"
                  type="number"
                  min="64"
                  max="960"
                  value={320}
                  ref={(el) => (imageWidth = el)}
                />
              </label>
              <div class="editor-settings-actions settings-full-width">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const instance = editor();
                    if (instance?.isActive('schoolImage')) {
                      instance.commands.updateAttributes('schoolImage', {
                        alt: imageDescription.value,
                        width: Math.min(960, Math.max(64, Number(imageWidth.value) || 320)),
                      });
                      setMessage('Gambar diperbarui.');
                    } else setMessage('Pilih gambar di editor terlebih dahulu.');
                  }}
                >
                  Perbarui gambar terpilih
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const instance = editor();
                    if (instance?.isActive('schoolImage')) {
                      instance.commands.deleteSelection();
                      setMessage('Gambar dilepas dari soal.');
                    } else setMessage('Pilih gambar di editor terlebih dahulu.');
                  }}
                >
                  Lepas gambar
                </Button>
              </div>
              <label class="field settings-full-width">
                <span class="field-label">Pilih gambar</span>
                <input
                  class="editor-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading()}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (file) void insertImage(file);
                  }}
                />
                <span class="field-hint">
                  PNG, JPG, atau WebP. Dikompres otomatis sebelum upload, maksimal 500 KB setelah
                  kompresi.
                </span>
              </label>
            </div>
          </details>
        </Show>
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
        <details class="editor-settings" ref={questionSettings}>
          <summary>Jenis soal dan penilaian</summary>
          <div class="editor-settings-body">
            <div class="field">
              <label class="field-label" for="question-kind">
                Jenis soal
              </label>
              <select
                id="question-kind"
                class="text-input"
                value={active()?.node.attrs.kind}
                onChange={(e) => changeQuestion('kind', e.currentTarget.value)}
              >
                <option value="single">Pilihan tunggal</option>
                <option value="multiple">Pilihan jamak</option>
                <option value="short">Jawaban singkat</option>
                <option value="essay">Esai</option>
              </select>
            </div>
            <label class="field">
              <span class="field-label">Bobot</span>
              <input
                class="text-input"
                type="number"
                min="1"
                max="100"
                value={active()?.node.attrs.weight}
                onChange={(e) => changeQuestion('weight', Number(e.currentTarget.value))}
              />
            </label>
            <Show when={active()?.node.attrs.kind === 'short'}>
              <label class="field settings-full-width">
                <span class="field-label">Jawaban yang diterima (satu per baris)</span>
                <textarea
                  class="text-input"
                  rows={3}
                  value={(active()?.node.attrs.accepted ?? []).join('\n')}
                  onChange={(e) =>
                    changeQuestion(
                      'accepted',
                      e.currentTarget.value
                        .split('\n')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </label>
            </Show>
            <Show when={active()?.node.attrs.kind === 'multiple'}>
              <For each={active()?.node.attrs.options as { id: string }[]}>
                {(option, index) => (
                  <label class="editor-key-check">
                    <input
                      type="checkbox"
                      checked={active()?.node.attrs.keys.includes(option.id)}
                      onChange={(e) => {
                        const keys = active()?.node.attrs.keys as string[];
                        changeQuestion(
                          'keys',
                          e.currentTarget.checked
                            ? [...keys, option.id]
                            : keys.filter((id) => id !== option.id),
                        );
                      }}
                    />
                    Kunci pilihan {index() + 1}
                  </label>
                )}
              </For>
            </Show>
          </div>
        </details>
        <div class="option-extraction-toolbar" role="group" aria-label="Ekstraksi pilihan jawaban">
          <div class="option-selection-heading">
            <strong>
              {canExtract()
                ? 'Teks dipilih — jadikan pilihan jawaban'
                : 'Pilihan jawaban dari teks'}
            </strong>
            <span class="field-hint">
              Seleksi satu jawaban untuk membuat satu opsi, atau beberapa baris berlabel A/B/C atau
              tanda - untuk mengekstrak sekaligus.
            </span>
          </div>
          <Button
            variant="secondary"
            disabled={!canExtract()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => extractSelection()}
          >
            Jadikan opsi
          </Button>
          <Button
            variant="secondary"
            disabled={!canExtract()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => extractSelection(true)}
          >
            Ekstrak beberapa opsi
          </Button>
          <Button
            variant="ghost"
            disabled={!editor()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setCommandMenuOpen(true)}
          >
            Menu tindakan{' '}
            <kbd class="shortcut-key" aria-hidden="true">
              {shortcutModifier} + K
            </kbd>
          </Button>
          <Show when={optionFeedback()} keyed>
            {(feedback) => (
              <div
                ref={optionFeedbackElement}
                class="option-action-feedback"
                data-phase={feedback.phase}
                role={feedback.phase === 'error' ? 'alert' : 'status'}
                aria-live={feedback.phase === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
              >
                <Show
                  when={feedback.phase === 'error'}
                  fallback={<CircleCheck size={22} aria-hidden="true" />}
                >
                  <CircleAlert size={22} aria-hidden="true" />
                </Show>
                <div>
                  <strong>
                    {feedback.phase === 'error'
                      ? 'Opsi belum berhasil ditambahkan'
                      : 'Pilihan jawaban berhasil diperbarui'}
                  </strong>
                  <p>{feedback.text}</p>
                  <Show when={feedback.phase === 'error'}>
                    <p class="field-hint">
                      Teks soal tidak diubah oleh percobaan ini. Perbaiki seleksi, lalu coba lagi.
                    </p>
                  </Show>
                </div>
              </div>
            )}
          </Show>
          <span class="field-hint">
            Atur urutan dan kunci di panel Pilihan jawaban. Pilih Kembalikan ke soal untuk
            memulihkan teks jawaban.
          </span>
        </div>
        <p class="field-hint import-help">
          Ketik <code>"%%%"</code> pada baris tersendiri untuk membuat soal berikutnya, atau gunakan
          Ctrl/Cmd + Enter.
        </p>
        <p class="import-feedback" role="status" aria-live="polite">
          {message()}
        </p>
        <div class="import-editing-layout inline-answer-layout">
          <div ref={host} />
        </div>
      </Show>
      <Dialog open={commandMenuOpen()} onOpenChange={setCommandMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="modal-overlay" />
          <div class="modal-positioner">
            <Dialog.Content
              class="modal-content editor-command-menu"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                editor()?.view.focus();
              }}
              onKeyDown={(event) => {
                if (event.isComposing) return;
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                  event.preventDefault();
                  event.stopPropagation();
                  setCommandMenuOpen(false);
                  return;
                }
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  const buttons = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>(
                      '[data-editor-command]:not(:disabled)',
                    ),
                  );
                  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
                  const next =
                    current < 0
                      ? event.key === 'ArrowDown'
                        ? 0
                        : buttons.length - 1
                      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                        buttons.length;
                  buttons[next]?.focus();
                  return;
                }
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.altKey &&
                  commands.some((item) => item.key === event.key.toLowerCase())
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  runCommand(event.key.toLowerCase());
                }
              }}
            >
              <div class="modal-heading">
                <Dialog.Title>Menu tindakan editor</Dialog.Title>
                <Dialog.CloseButton class="icon-button" aria-label="Tutup menu tindakan">
                  <X size={20} aria-hidden="true" />
                </Dialog.CloseButton>
              </div>
              <Dialog.Description class="field-hint">
                Tekan huruf di sebelah tindakan, atau pilih dengan ↑/↓ lalu Enter. Esc untuk
                menutup.
              </Dialog.Description>
              <Show when={!canExtract()}>
                <p class="command-selection-hint">
                  Seleksi teks jawaban di editor untuk mengaktifkan tindakan S dan D.
                </p>
              </Show>
              <div class="editor-command-list">
                <For each={commands}>
                  {(command) => (
                    <button
                      type="button"
                      class="editor-command"
                      data-editor-command={command.key}
                      aria-keyshortcuts={command.key.toUpperCase()}
                      disabled={command.disabled()}
                      onClick={() => runCommand(command.key)}
                    >
                      <span>
                        <strong>{command.label}</strong>
                        <span class="field-hint">{command.description}</span>
                      </span>
                      <kbd aria-hidden="true">{command.key.toUpperCase()}</kbd>
                    </button>
                  )}
                </For>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </section>
  );
}
