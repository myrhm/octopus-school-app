import { splitProps } from 'solid-js';
import type { JSX } from 'solid-js';

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export default function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children', 'type']);
  return (
    <button
      type={local.type ?? 'button'}
      class={`button ${local.class ?? ''}`}
      data-variant={local.variant ?? 'primary'}
      {...rest}
    >
      {local.children}
    </button>
  );
}
