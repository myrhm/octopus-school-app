import { createSignal, For, Show } from 'solid-js';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { JSONContent } from '@tiptap/core';
import Button from '../../components/ui/Button';
import { questionAt } from './document';
import { readOptions } from './question-contract';
import { moveOption, returnOption, setCorrectOption } from './answer-options';
import Eye from 'lucide-solid/icons/eye';
import EyeOff from 'lucide-solid/icons/eye-off';
import RichText from '../student-preview/RichText';
import { backend } from '../../backend/client';
import { uploadMedia } from '../../backend/media';
import { closeHistory } from '@tiptap/pm/history';
import ImagePlus from 'lucide-solid/icons/image-plus';

function hasAnswerContent(content: JSONContent[] | undefined): boolean {
  return (
    Array.isArray(content) &&
    content.some(
      (node) =>
        (node.type === 'text' && Boolean(node.text?.trim())) ||
        node.type === 'schoolImage' ||
        hasAnswerContent(node.content),
    )
  );
}

type Result = { transaction: Transaction } | { error: string };

export default function AnswerOptionsPanel(props: {
  state: () => EditorState | undefined;
  apply: (result: Result, focusEditor?: boolean) => void;
  questionId?: string;
}) {
  const [expanded, setExpanded] = createSignal(true);
  const [uploadingOption, setUploadingOption] = createSignal('');
  const [imageDrafts, setImageDrafts] = createSignal<
    Record<string, { alt: string; width: string }>
  >({});
  const [mediaFeedback, setMediaFeedback] = createSignal<{
    option: string;
    error: boolean;
    text: string;
  }>();
  const imageDraft = (id: string) => imageDrafts()[id] ?? { alt: '', width: '320' };
  const imageWidth = (id: string) =>
    Math.min(960, Math.max(64, Number(imageDraft(id).width) || 320));
  function setImageDraft(id: string, key: 'alt' | 'width', value: string) {
    setImageDrafts((previous) => ({ ...previous, [id]: { ...imageDraft(id), [key]: value } }));
  }
  const active = () => {
    const state = props.state();
    if (!state) return null;
    if (!props.questionId) return questionAt(state);
    let found: ReturnType<typeof questionAt> = null;
    state.doc.forEach((node, position, index) => {
      if (node.attrs.id === props.questionId) found = { node, start: position, index };
    });
    return found;
  };
  const multiple = () => active()?.node.attrs.kind === 'multiple';
  const options = () => readOptions(active()?.node.attrs.options);
  const apply = (action: (state: EditorState, questionId: string) => Result, focus = false) => {
    const state = props.state();
    const question = active();
    if (state && question) props.apply(action(state, question.node.attrs.id as string), focus);
  };
  function updateOptionContent(
    id: string,
    transform: (content: JSONContent[]) => JSONContent[],
    questionId = active()?.node.attrs.id as string | undefined,
  ) {
    const state = props.state();
    if (!state || !questionId) throw new Error('Soal tidak lagi tersedia. Buka ulang draft.');
    let question: ReturnType<typeof questionAt> = null;
    state.doc.forEach((node, position, index) => {
      if (node.attrs.id === questionId) question = { node, start: position, index };
    });
    const current = question as ReturnType<typeof questionAt>;
    if (!current) throw new Error('Soal sudah dihapus. Gambar tidak disisipkan.');
    const options = readOptions(current.node.attrs.options);
    if (!options.some((option) => option.id === id))
      throw new Error('Opsi sudah berubah atau dihapus. Gambar tidak disisipkan.');
    props.apply(
      {
        transaction: closeHistory(state.tr).setNodeMarkup(current.start, undefined, {
          ...current.node.attrs,
          options: options.map((option) =>
            option.id === id ? { ...option, content: transform(option.content ?? []) } : option,
          ),
        }),
      },
      false,
    );
  }
  function images(content: JSONContent[]): { fileId: string; alt: string }[] {
    const found = new Map<string, string>();
    function visit(nodes: JSONContent[]) {
      for (const node of nodes) {
        if (node.type === 'schoolImage' && typeof node.attrs?.fileId === 'string')
          found.set(node.attrs.fileId, String(node.attrs.alt ?? ''));
        if (node.content) visit(node.content);
      }
    }
    visit(content);
    return [...found].map(([fileId, alt]) => ({ fileId, alt }));
  }
  function mapImage(
    content: JSONContent[],
    fileId: string,
    change: (node: JSONContent) => JSONContent | null,
  ): JSONContent[] {
    return content.flatMap((node) => {
      if (node.type === 'schoolImage' && node.attrs?.fileId === fileId) {
        const next = change(node);
        return next ? [next] : [];
      }
      return [
        { ...node, ...(node.content ? { content: mapImage(node.content, fileId, change) } : {}) },
      ];
    });
  }
  async function addImage(id: string, file: File) {
    if (uploadingOption()) return;
    const questionId = active()?.node.attrs.id as string | undefined;
    const alt = imageDraft(id).alt.trim() || file.name;
    const width = imageWidth(id);
    setUploadingOption(id);
    setMediaFeedback({ option: id, error: false, text: 'Mengompres dan mengunggah gambar…' });
    try {
      const fileId = await uploadMedia(file);
      updateOptionContent(
        id,
        (content) => [
          ...content,
          { type: 'paragraph', content: [{ type: 'schoolImage', attrs: { fileId, alt, width } }] },
        ],
        questionId,
      );
      setMediaFeedback({ option: id, error: false, text: 'Gambar ditambahkan ke jawaban.' });
    } catch (error) {
      setMediaFeedback({
        option: id,
        error: true,
        text: error instanceof Error ? error.message : 'Gambar belum dapat ditambahkan. Coba lagi.',
      });
    } finally {
      setUploadingOption('');
    }
  }
  return (
    <section
      class="answer-options-panel inline-answer-options"
      aria-label={'Pilihan jawaban soal ' + (active() ? active()!.index + 1 : '')}
    >
      <div class="inline-answer-heading">
        <div>
          <h3>Pilihan jawaban</h3>
          <p class="field-hint">
            {active()
              ? `Soal ${active()!.index + 1} · ${options().length} opsi`
              : 'Klik soal untuk melihat pilihannya.'}
          </p>
        </div>
        <Button
          variant="ghost"
          class="answer-visibility-toggle"
          aria-expanded={expanded()}
          aria-controls={'answers-' + props.questionId}
          onClick={() => setExpanded(!expanded())}
        >
          <Show when={expanded()} fallback={<Eye size={18} aria-hidden="true" />}>
            <EyeOff size={18} aria-hidden="true" />
          </Show>
          {expanded() ? 'Sembunyikan jawaban' : 'Tampilkan jawaban'}
        </Button>
      </div>
      <Show when={expanded()}>
        <div id={'answers-' + props.questionId} class="inline-answer-body">
          <Show when={(active()?.node.attrs.keyConflictIds as string[] | undefined)?.length}>
            <p class="option-warning" role="alert">
              Soal yang digabung memiliki kunci berbeda. Pilih kembali satu jawaban benar.
            </p>
          </Show>
          <Show
            when={options().length}
            fallback={
              <p class="option-empty">
                Seleksi teks soal, lalu pilih Jadikan opsi atau Ekstrak beberapa opsi.
              </p>
            }
          >
            <fieldset class="option-fieldset">
              <legend class="field-label">
                {multiple() ? 'Pilih semua jawaban benar' : 'Pilih satu jawaban benar'}
              </legend>
              <For each={options().map((option) => option.id)}>
                {(id) => {
                  const index = () => options().findIndex((option) => option.id === id);
                  const option = () =>
                    options().find((item) => item.id === id) ?? { id, content: [] };
                  const content = () => {
                    const saved = option().content;
                    if (hasAnswerContent(saved)) return saved;
                    const source = active()?.node.attrs.optionSources?.[id] as
                      { fallbackContent?: JSONContent[]; content?: JSONContent[] } | undefined;
                    const recovery = source?.fallbackContent ?? source?.content;
                    return hasAnswerContent(recovery) ? recovery : undefined;
                  };
                  const label = () => String.fromCharCode(65 + index());
                  return (
                    <div class="answer-option-card" data-option-id={id}>
                      <label class="option-key">
                        <input
                          type={multiple() ? 'checkbox' : 'radio'}
                          name={`key-${active()?.node.attrs.id}`}
                          checked={
                            multiple()
                              ? (active()?.node.attrs.keys ?? []).includes(id)
                              : active()?.node.attrs.correctOptionId === id
                          }
                          onChange={(event) => {
                            if (!multiple()) {
                              apply((state, questionId) => setCorrectOption(state, questionId, id));
                              return;
                            }
                            const question = active();
                            if (!question) return;
                            const keys = question.node.attrs.keys as string[];
                            const next = event.currentTarget.checked
                              ? [...keys.filter((key) => key !== id), id]
                              : keys.filter((key) => key !== id);
                            apply((state) => ({
                              transaction: state.tr.setNodeMarkup(question.start, undefined, {
                                ...question.node.attrs,
                                keys: next,
                              }),
                            }));
                          }}
                        />
                        <span>
                          Opsi {label()}
                          {(
                            multiple()
                              ? (active()?.node.attrs.keys ?? []).includes(id)
                              : active()?.node.attrs.correctOptionId === id
                          )
                            ? ' · Kunci jawaban'
                            : ''}
                        </span>
                      </label>
                      <Show
                        when={content()}
                        fallback={
                          <p class="field-error" role="alert">
                            Isi jawaban belum dapat ditampilkan. Pilih Kembalikan ke soal untuk
                            memulihkan teks asalnya.
                          </p>
                        }
                      >
                        {(value) => (
                          <div class="answer-option-content">
                            <RichText content={value()} />
                          </div>
                        )}
                      </Show>
                      <div class="option-actions">
                        <Button
                          variant="secondary"
                          aria-label={`Naikkan opsi ${label()}`}
                          disabled={index() === 0}
                          onClick={() =>
                            apply((state, questionId) => moveOption(state, questionId, id, -1))
                          }
                        >
                          Naik
                        </Button>
                        <Button
                          variant="secondary"
                          aria-label={`Turunkan opsi ${label()}`}
                          disabled={index() === options().length - 1}
                          onClick={() =>
                            apply((state, questionId) => moveOption(state, questionId, id, 1))
                          }
                        >
                          Turun
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Kembalikan opsi ${label()} ke soal`}
                          onClick={() =>
                            apply((state, questionId) => returnOption(state, questionId, id), true)
                          }
                        >
                          Kembalikan ke soal
                        </Button>
                      </div>
                      <Show when={backend}>
                        <details class="answer-media-settings">
                          <summary>
                            <ImagePlus size={18} aria-hidden="true" />
                            Gambar jawaban
                          </summary>
                          <div class="answer-media-fields">
                            <label class="field">
                              <span class="field-label">Deskripsi gambar</span>
                              <input
                                class="text-input"
                                type="text"
                                maxlength={250}
                                value={imageDraft(id).alt}
                                placeholder="Contoh: diagram aliran air"
                                onInput={(event) =>
                                  setImageDraft(id, 'alt', event.currentTarget.value)
                                }
                              />
                            </label>
                            <label class="field">
                              <span class="field-label">Lebar tampil (piksel)</span>
                              <input
                                class="text-input"
                                type="number"
                                min="64"
                                max="960"
                                value={imageDraft(id).width}
                                onInput={(event) =>
                                  setImageDraft(id, 'width', event.currentTarget.value)
                                }
                              />
                            </label>
                            <label
                              class="answer-image-upload button"
                              data-variant="secondary"
                              data-disabled={Boolean(uploadingOption())}
                            >
                              {uploadingOption() === id ? 'Memproses gambar…' : 'Tambahkan gambar'}
                              <input
                                class="sr-only"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                disabled={Boolean(uploadingOption())}
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  event.currentTarget.value = '';
                                  if (file) void addImage(id, file);
                                }}
                              />
                            </label>
                            <p class="field-hint">
                              Dikompres otomatis. Maksimal 500 KB setelah kompresi.
                            </p>
                            <For each={images(option().content ?? [])}>
                              {(image) => (
                                <div class="answer-image-row">
                                  <span class="field-hint">{image.alt || 'Gambar jawaban'}</span>
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      const alt = imageDraft(id).alt.trim();
                                      const width = imageWidth(id);
                                      updateOptionContent(id, (content) =>
                                        mapImage(content, image.fileId, (node) => ({
                                          ...node,
                                          attrs: {
                                            ...node.attrs,
                                            alt: alt || node.attrs?.alt,
                                            width,
                                          },
                                        })),
                                      );
                                    }}
                                  >
                                    Perbarui gambar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      updateOptionContent(id, (content) =>
                                        mapImage(content, image.fileId, () => null),
                                      )
                                    }
                                  >
                                    Lepas gambar
                                  </Button>
                                </div>
                              )}
                            </For>
                          </div>
                        </details>
                        <Show when={mediaFeedback()?.option === id}>
                          <p
                            class="answer-media-feedback"
                            data-error={mediaFeedback()?.error}
                            role={mediaFeedback()?.error ? 'alert' : 'status'}
                          >
                            {mediaFeedback()?.text}
                          </p>
                        </Show>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </fieldset>
            <Show
              when={
                !(multiple()
                  ? active()?.node.attrs.keys?.length
                  : active()?.node.attrs.correctOptionId) &&
                !(active()?.node.attrs.keyConflictIds as string[] | undefined)?.length
              }
            >
              <p class="field-hint">Kunci jawaban belum dipilih.</p>
            </Show>
          </Show>
        </div>
      </Show>
    </section>
  );
}
