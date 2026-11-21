import { createMemo, createSignal, For, Show } from 'solid-js';
import ArrowLeft from 'lucide-solid/icons/arrow-left';
import ArrowRight from 'lucide-solid/icons/arrow-right';
import Check from 'lucide-solid/icons/check';
import Button from '../../components/ui/Button';
import RichText from './RichText';
import { hasText } from './contract';
import type { StudentQuestion } from './contract';
import './student-preview.css';

export default function StudentPreview(props: {
  title: string;
  questions: readonly StudentQuestion[];
  example?: boolean;
}) {
  const [index, setIndex] = createSignal(0);
  const [answers, setAnswers] = createSignal<ReadonlyMap<string, string>>(new Map());
  const [navigatorOpen, setNavigatorOpen] = createSignal(false);
  const current = () => props.questions[index()];
  const answered = createMemo(
    () =>
      props.questions.filter((question) =>
        question.options.some((option) => option.id === answers().get(question.id)),
      ).length,
  );
  let questionHeading: HTMLHeadingElement | undefined;

  function goTo(next: number, closeNavigator = false) {
    if (next < 0 || next >= props.questions.length) return;
    setIndex(next);
    if (closeNavigator) setNavigatorOpen(false);
    questionHeading?.focus();
  }

  function choose(questionId: string, optionId?: string) {
    setAnswers((previous) => {
      const next = new Map(previous);
      if (optionId) next.set(questionId, optionId);
      else next.delete(questionId);
      return next;
    });
  }

  return (
    <section class="student-preview" aria-labelledby="preview-title">
      <div class="preview-intro">
        <p class="eyebrow">PRATINJAU SISWA{props.example ? ' · CONTOH' : ''}</p>
        <h1 id="preview-title">{props.title.trim() || 'Draft tanpa nama'}</h1>
        <p class="intro">
          Coba membaca soal dan memilih jawaban seperti siswa. Pilihan percobaan tidak disimpan dan
          tidak mengubah draft.
        </p>
      </div>
      <Show
        when={props.questions.length}
        fallback={
          <div class="panel preview-empty">
            <h2>Belum ada soal</h2>
            <p>Tambahkan soal di editor untuk melihat pratinjau.</p>
          </div>
        }
      >
        <div class="preview-layout">
          <div class="preview-reading">
            <Show when={current()} keyed>
              {(question) => (
                <article class="preview-question" aria-labelledby="preview-question-title">
                  <div class="preview-question-heading">
                    <h2 id="preview-question-title" tabindex="-1" ref={questionHeading}>
                      Soal {index() + 1} dari {props.questions.length}
                    </h2>
                    <span class="preview-answer-status">
                      {answers().has(question.id) ? 'Sudah dipilih' : 'Belum dipilih'}
                    </span>
                  </div>
                  <Show
                    when={hasText(question.content)}
                    fallback={<p class="preview-placeholder">Isi soal belum ditambahkan.</p>}
                  >
                    <RichText content={question.content} />
                  </Show>
                  <Show
                    when={question.options.length}
                    fallback={<p class="preview-placeholder">Pilihan jawaban belum ditambahkan.</p>}
                  >
                    <fieldset class="preview-options">
                      <legend>Pilih satu jawaban</legend>
                      <For each={question.options}>
                        {(option, optionIndex) => (
                          <div
                            class="preview-option"
                            classList={{ 'is-selected': answers().get(question.id) === option.id }}
                          >
                            <input
                              type="radio"
                              id={`preview-option-${index()}-${optionIndex()}`}
                              name={`preview-question-${index()}`}
                              value={option.id}
                              aria-labelledby={`preview-label-${index()}-${optionIndex()}`}
                              checked={answers().get(question.id) === option.id}
                              onChange={() => choose(question.id, option.id)}
                            />
                            <div
                              id={`preview-label-${index()}-${optionIndex()}`}
                              class="preview-option-content"
                            >
                              <label
                                for={`preview-option-${index()}-${optionIndex()}`}
                                class="preview-option-label"
                              >
                                <span aria-hidden="true">
                                  {optionIndex() < 26
                                    ? String.fromCharCode(65 + optionIndex())
                                    : optionIndex() + 1}
                                  .
                                </span>
                                <span class="sr-only">Pilihan {optionIndex() + 1}</span>
                              </label>
                              <Show
                                when={hasText(option.content)}
                                fallback={<p>Pilihan ini belum diisi.</p>}
                              >
                                <RichText content={option.content} />
                              </Show>
                            </div>
                          </div>
                        )}
                      </For>
                    </fieldset>
                    <Button
                      variant="ghost"
                      disabled={!answers().has(question.id)}
                      onClick={() => choose(question.id)}
                    >
                      Hapus pilihan
                    </Button>
                  </Show>
                </article>
              )}
            </Show>
            <nav class="preview-pagination" aria-label="Pindah soal">
              <Button
                variant="secondary"
                disabled={index() === 0}
                onClick={() => goTo(index() - 1)}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Sebelumnya
              </Button>
              <Button
                disabled={index() >= props.questions.length - 1}
                onClick={() => goTo(index() + 1)}
              >
                Berikutnya
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </nav>
            <p class="field-hint preview-end" role="status">
              {index() === props.questions.length - 1
                ? 'Ini soal terakhir. Anda dapat kembali untuk mencoba pilihan lain.'
                : ''}
            </p>
          </div>
          <aside class="preview-navigator" aria-label="Ringkasan soal">
            <h2>Daftar soal</h2>
            <p class="field-hint" role="status">
              {answered()} dari {props.questions.length} soal sudah dipilih
            </p>
            <Button
              class="preview-navigator-toggle"
              variant="secondary"
              aria-expanded={navigatorOpen()}
              aria-controls="preview-question-list"
              onClick={() => setNavigatorOpen(!navigatorOpen())}
            >
              {navigatorOpen() ? 'Tutup' : 'Buka'} daftar {props.questions.length} soal
            </Button>
            <nav
              id="preview-question-list"
              classList={{ 'is-open': navigatorOpen() }}
              aria-label="Nomor soal"
            >
              <For each={props.questions}>
                {(question, questionIndex) => (
                  <button
                    type="button"
                    class="preview-number"
                    classList={{ 'is-answered': answers().has(question.id) }}
                    aria-label={`Soal ${questionIndex() + 1}, ${answers().has(question.id) ? 'sudah dipilih' : 'belum dipilih'}`}
                    aria-current={index() === questionIndex() ? 'step' : undefined}
                    onClick={() => goTo(questionIndex(), true)}
                  >
                    {questionIndex() + 1}
                    <Show when={answers().has(question.id)}>
                      <Check size={12} aria-hidden="true" />
                    </Show>
                  </button>
                )}
              </For>
            </nav>
            <p class="field-hint preview-legend">
              <Check size={14} aria-hidden="true" /> Sudah dipilih
            </p>
            <p class="field-hint">
              Pilihan akan dikosongkan saat Anda keluar atau memuat ulang pratinjau.
            </p>
          </aside>
        </div>
      </Show>
    </section>
  );
}
