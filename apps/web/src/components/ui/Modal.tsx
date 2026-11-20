import { Dialog } from '@kobalte/core/dialog';
import X from 'lucide-solid/icons/x';
import type { ParentProps } from 'solid-js';

export default function Modal(
  props: ParentProps<{ triggerLabel: string; title: string; description: string }>,
) {
  return (
    <Dialog>
      <Dialog.Trigger class="button" data-variant="secondary">
        {props.triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="modal-positioner">
          <Dialog.Content class="modal-content">
            <div class="modal-heading">
              <Dialog.Title>{props.title}</Dialog.Title>
              <Dialog.CloseButton class="icon-button" aria-label="Tutup dialog">
                <X size={20} aria-hidden="true" />
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class="text-muted">{props.description}</Dialog.Description>
            {props.children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
