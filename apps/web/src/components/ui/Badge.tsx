import type { ParentProps } from 'solid-js';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export default function Badge(props: ParentProps<{ tone?: Tone }>) {
  return (
    <span class="badge" data-tone={props.tone ?? 'neutral'}>
      {props.children}
    </span>
  );
}
