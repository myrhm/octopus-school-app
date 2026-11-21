import { createResource } from 'solid-js';
import { participantCall } from '../../backend/participant-client';
import { call } from '../../backend/client';
import type { JSONContent } from '@tiptap/core';
import { For, Show, Switch, Match } from 'solid-js';
import { Dynamic } from 'solid-js/web';

function RichNode(props: { node: JSONContent; attempt?: string | undefined }) {
  const [image] = createResource(
    () => (props.node.type === 'schoolImage' ? props.node.attrs?.fileId : false),
    (fileId) =>
      props.attempt
        ? participantCall<string>(props.attempt, 'participant_media', { fileId })
        : call<string>('teacher_media', { fileId }),
  );
  const marked = (type: string) => props.node.marks?.some((mark) => mark.type === type);
  const tag = () => {
    switch (props.node.type) {
      case 'heading':
        return props.node.attrs?.level === 3 ? 'h3' : 'h2';
      case 'bulletList':
        return 'ul';
      case 'orderedList':
        return 'ol';
      case 'listItem':
        return 'li';
      case 'blockquote':
        return 'blockquote';
      default:
        return 'p';
    }
  };
  return (
    <Switch>
      <Match when={props.node.type === 'text'}>
        <span
          classList={{
            'preview-bold': marked('bold'),
            'preview-italic': marked('italic'),
            'preview-underline': marked('underline'),
            'preview-strike': marked('strike'),
          }}
        >
          {props.node.text}
        </span>
      </Match>
      <Match when={props.node.type === 'schoolImage'}>
        <img
          src={image.error ? undefined : image()}
          alt={props.node.attrs?.alt ?? ''}
          width={props.node.attrs?.width ?? 320}
          style={{ 'max-width': '100%', height: 'auto' }}
        />
      </Match>
      <Match when={props.node.type === 'hardBreak'}>
        <br />
      </Match>
      <Match when={props.node.type !== 'text' && props.node.type !== 'hardBreak'}>
        <Dynamic
          component={tag()}
          start={props.node.type === 'orderedList' ? props.node.attrs?.start : undefined}
        >
          <Show when={props.node.content?.length} fallback={<br />}>
            <For each={props.node.content}>
              {(node) => <RichNode attempt={props.attempt} node={node} />}
            </For>
          </Show>
        </Dynamic>
      </Match>
    </Switch>
  );
}

export default function RichText(props: {
  content: readonly JSONContent[];
  attempt?: string | undefined;
}) {
  return (
    <div class="preview-rich-text">
      <For each={props.content}>{(node) => <RichNode attempt={props.attempt} node={node} />}</For>
    </div>
  );
}
