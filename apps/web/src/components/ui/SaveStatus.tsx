import Check from 'lucide-solid/icons/check';
import CloudOff from 'lucide-solid/icons/cloud-off';
import LoaderCircle from 'lucide-solid/icons/loader-circle';
import TriangleAlert from 'lucide-solid/icons/triangle-exclamation-point';
import { Dynamic } from 'solid-js/web';

const statuses = {
  saved: { label: 'Tersimpan', icon: Check, tone: 'success' },
  saving: { label: 'Menyimpan', icon: LoaderCircle, tone: 'info' },
  offline: { label: 'Offline — perubahan belum terkirim', icon: CloudOff, tone: 'warning' },
  syncing: { label: 'Menyinkronkan', icon: LoaderCircle, tone: 'info' },
  error: { label: 'Gagal menyimpan — coba lagi', icon: TriangleAlert, tone: 'danger' },
} as const;

export default function SaveStatus(props: { state: keyof typeof statuses }) {
  return (
    <span
      class="save-status"
      data-tone={statuses[props.state].tone}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Dynamic
        component={statuses[props.state].icon}
        size={16}
        aria-hidden="true"
        class={props.state === 'saving' || props.state === 'syncing' ? 'spin' : ''}
      />
      {statuses[props.state].label}
    </span>
  );
}
