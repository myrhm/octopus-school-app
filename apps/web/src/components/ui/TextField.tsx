import { TextField as Field } from '@kobalte/core/text-field';
import { Show } from 'solid-js';

export default function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string | undefined;
  type?: 'text' | 'search';
}) {
  return (
    <Field
      class="field"
      value={props.value}
      onChange={props.onChange}
      validationState={props.error ? 'invalid' : 'valid'}
    >
      <Field.Label class="field-label">{props.label}</Field.Label>
      <Field.Input class="text-input" type={props.type ?? 'text'} placeholder={props.placeholder} />
      <Show when={props.description}>
        <Field.Description class="field-hint">{props.description}</Field.Description>
      </Show>
      <Show when={props.error}>
        <Field.ErrorMessage class="field-error">{props.error}</Field.ErrorMessage>
      </Show>
    </Field>
  );
}
