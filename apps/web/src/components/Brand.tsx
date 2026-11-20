import { Show } from 'solid-js';

export default function Brand(props: { symbol?: boolean }) {
  return (
    <Show
      when={props.symbol}
      fallback={
        <span class="brand-wordmark">
          <img
            class="logo-light"
            src="/brand/octopus-wordmark-light.png"
            alt="Octopus"
            width="128"
            height="128"
          />
          <img
            class="logo-dark"
            src="/brand/octopus-wordmark-dark.png"
            alt="Octopus"
            width="128"
            height="138"
          />
        </span>
      }
    >
      <img
        class="brand-symbol"
        src="/brand/octopus-symbol.png"
        alt="Octopus"
        width="48"
        height="48"
      />
    </Show>
  );
}
