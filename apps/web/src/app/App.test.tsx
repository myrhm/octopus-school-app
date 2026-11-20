import { fireEvent, render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('application routing', () => {
  it('navigates to the question bank and supports browser back', async () => {
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Ruang untuk soal dan ujian Anda.' });
    fireEvent.click(screen.getByRole('link', { name: 'Buka bank soal' }));
    await screen.findByRole('heading', { name: 'Bank soal' });
    expect(window.location.pathname).toBe('/bank-soal');
    window.history.back();
    await screen.findByRole('heading', { name: 'Ruang untuk soal dan ujian Anda.' });
  });

  it('renders a directly opened route', async () => {
    window.history.replaceState(null, '', '/bank-soal');
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Bank soal' });
    expect(screen.queryByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeNull();
  });

  it('provides a way home from an unknown URL', async () => {
    window.history.replaceState(null, '', '/tidak-ada');
    render(() => <App />);
    await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' });
    fireEvent.click(screen.getByRole('link', { name: 'Kembali ke ringkasan' }));
    await screen.findByRole('heading', { name: 'Ruang untuk soal dan ujian Anda.' });
  });
});
