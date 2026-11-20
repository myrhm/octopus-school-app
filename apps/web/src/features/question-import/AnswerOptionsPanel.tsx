import { createEffect, For, Show } from 'solid-js';
import { DOMSerializer, Fragment } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { JSONContent } from '@tiptap/core';
import Button from '../../components/ui/Button';
import { questionAt } from './document';
import { readOptions } from './question-contract';
import { moveOption, returnOption, setCorrectOption } from './answer-options';

function OptionContent(props: { content: JSONContent[]; state: EditorState }) {
  let host!: HTMLDivElement;
  createEffect(() => {
    const nodes = props.content.map((value) => props.state.schema.nodeFromJSON(value));
    nodes.forEach((node) => node.check());
    host.replaceChildren(
      DOMSerializer.fromSchema(props.state.schema).serializeFragment(Fragment.fromArray(nodes)),
    );
  });
  return <div ref={host} class="answer-option-content" />;
}

type Result = { transaction: Transaction } | { error: string };

export default function AnswerOptionsPanel(props: {
  state: () => EditorState | undefined;
  apply: (result: Result, focusEditor?: boolean) => void;
}) {
  const active = () => {
    const state = props.state();
    return state ? questionAt(state) : null;
  };
  const options = () => readOptions(active()?.node.attrs.options);
  const apply = (action: (state: EditorState, questionId: string) => Result, focus = false) => {
    const state = props.state();
    const question = active();
    if (state && question) props.apply(action(state, question.node.attrs.id as string), focus);
  };
  return (
    <aside class="answer-options-panel panel" aria-label="Pilihan jawaban soal aktif">
      <h2>Pilihan jawaban</h2>
      <p class="field-hint">
        {active()
          ? `Soal ${active()!.index + 1} · ${options().length} opsi`
          : 'Klik soal untuk melihat pilihannya.'}
      </p>
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
          <legend class="field-label">Pilih satu jawaban benar</legend>
          <For each={options().map((option) => option.id)}>
            {(id) => {
              const index = () => options().findIndex((option) => option.id === id);
              const option = () => options().find((item) => item.id === id) ?? { id, content: [] };
              const label = () => String.fromCharCode(65 + index());
              return (
                <div class="answer-option-card" data-option-id={id}>
                  <label class="option-key">
                    <input
                      type="radio"
                      name={`key-${active()?.node.attrs.id}`}
                      checked={active()?.node.attrs.correctOptionId === id}
                      onChange={() =>
                        apply((state, questionId) => setCorrectOption(state, questionId, id))
                      }
                    />
                    <span>
                      Opsi {label()}
                      {active()?.node.attrs.correctOptionId === id ? ' · Kunci jawaban' : ''}
                    </span>
                  </label>
                  <Show when={props.state()}>
                    {(state) => <OptionContent content={option().content} state={state()} />}
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
                </div>
              );
            }}
          </For>
        </fieldset>
        <Show
          when={
            !active()?.node.attrs.correctOptionId &&
            !(active()?.node.attrs.keyConflictIds as string[] | undefined)?.length
          }
        >
          <p class="field-hint">Kunci jawaban belum dipilih.</p>
        </Show>
      </Show>
    </aside>
  );
}
