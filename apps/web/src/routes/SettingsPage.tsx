import ThemeSelect from '../components/ThemeSelect';
import Modal from '../components/ui/Modal';
import Brand from '../components/Brand';

export default function SettingsPage() {
  return (
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">SESUAIKAN RUANG KERJA</p>
      <h1 id="page-title">Pengaturan</h1>
      <p class="intro">Pilih tampilan yang nyaman untuk Anda.</p>
      <section class="panel settings-panel">
        <div>
          <h2>Tema tampilan</h2>
          <p class="text-muted">
            Pilihan tersimpan di browser ini. Mode sistem mengikuti tampilan perangkat Anda.
          </p>
        </div>
        <ThemeSelect />
      </section>
      <section class="panel settings-panel">
        <div>
          <h2>Tentang Octopus</h2>
          <p class="text-muted">Ruang untuk menyusun soal dan mengelola ujian sekolah.</p>
        </div>
        <Modal
          triggerLabel="Tentang Octopus"
          title="Belajar dimulai dari persiapan yang baik."
          description="Octopus membantu guru membawa soal yang sudah dimiliki ke dalam alur ujian yang lebih tertata."
        >
          <div class="about-brand">
            <Brand />
          </div>
          <p class="field-hint">
            Ini adalah pratinjau antarmuka. Akun sekolah, penyimpanan soal, dan penyelenggaraan
            ujian belum tersedia.
          </p>
        </Modal>
      </section>
    </section>
  );
}
