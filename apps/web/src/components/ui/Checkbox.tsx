import { createUniqueId } from 'solid-js';

export default function Checkbox(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = createUniqueId();
  return (
    <label class="checkbox-field" for={id}>
      <input
        id={id}
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}
