import { createSignal, For } from 'solid-js';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TextField from '../components/ui/TextField';
import Checkbox from '../components/ui/Checkbox';
import Modal from '../components/ui/Modal';
import SaveStatus from '../components/ui/SaveStatus';

// Internal visual review surface; not part of the teacher navigation.
export default function ComponentsPage() {
  const [value, setValue] = createSignal('');
  const [checked, setChecked] = createSignal(false);
  return (
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">REFERENSI DESAIN</p>
      <h1 id="page-title">Komponen antarmuka</h1>
      <p class="intro">
        Contoh visual untuk peninjauan desain. Formulir dan status di halaman ini tidak menyimpan
        data.
      </p>
      <div class="component-grid">
        <section class="panel">
          <h2>Tombol</h2>
          <div class="flex flex-wrap gap-3">
            <Button>Simpan</Button>
            <Button variant="secondary">Batal</Button>
            <Button variant="ghost">Detail</Button>
            <Button variant="danger">Hapus</Button>
            <Button disabled>Belum tersedia</Button>
          </div>
        </section>
        <section class="panel">
          <h2>Formulir</h2>
          <TextField
            label="Nama bank soal"
            value={value()}
            onChange={setValue}
            placeholder="Contoh: Matematika kelas 8"
            description="Contoh input; data tidak disimpan."
            error={value().length > 40 ? 'Gunakan paling banyak 40 karakter.' : undefined}
          />
          <Checkbox label="Tandai untuk ditinjau" checked={checked()} onChange={setChecked} />
        </section>
        <section class="panel">
          <h2>Status</h2>
          <div class="flex flex-wrap gap-3">
            <Badge tone="success">Memenuhi standar</Badge>
            <Badge tone="warning">Perlu ditinjau</Badge>
            <Badge tone="danger">Gagal diunggah</Badge>
            <Badge tone="info">Menunggu koreksi</Badge>
            <Badge>Draft</Badge>
          </div>
        </section>
        <section class="panel">
          <h2>Penyimpanan</h2>
          <div class="flex flex-col gap-4">
            <For each={['saved', 'saving', 'offline', 'syncing', 'error'] as const}>
              {(state) => <SaveStatus state={state} />}
            </For>
          </div>
        </section>
        <section class="panel">
          <h2>Dialog</h2>
          <Modal
            triggerLabel="Buka contoh dialog"
            title="Tinjau sebelum melanjutkan"
            description="Dialog ini hanya contoh. Menutupnya tidak mengubah data."
          >
            <p>Gunakan Escape atau tombol tutup untuk kembali.</p>
          </Modal>
        </section>
      </div>
    </section>
  );
}
