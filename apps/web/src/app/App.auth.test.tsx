import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), login: vi.fn(), call: vi.fn() }));
vi.mock('../backend/client', async () => {
  const { createSignal } = await import('solid-js');
  const [school, setSchool] = createSignal('');
  return {
    backend: { account: { get: mocks.get, createEmailPasswordSession: mocks.login } },
    school,
    setSchool,
    schools: async () => [{ id: 'school', name: 'Sekolah Uji' }],
    call: mocks.call,
  };
});
import App from './App';
import { setSchool } from '../backend/client';

beforeEach(() => {
  vi.resetAllMocks();
  setSchool('');
  mocks.get.mockRejectedValue(new Error('No session'));
  mocks.call.mockResolvedValue([]);
});

it('prompts before navigating to workspace features and never loads their data for a guest', async () => {
  render(() => <App />);
  await screen.findByRole('button', { name: 'Masuk' });
  for (const name of [
    'Buka bank soal',
    'Ujian',
    'Monitoring',
    'Nilai dan analisis',
    'Pengaturan',
  ]) {
    await fireEvent.click(screen.getByRole('link', { name }));
    await screen.findByRole('heading', { name: 'Masuk terlebih dahulu' });
    expect(window.location.pathname).toBe('/');
    expect(mocks.call).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog' }));
    await waitFor(() => expect(screen.getByRole('dialog').hasAttribute('data-closed')).toBe(true));
  }
});

it('returns direct private URLs to the overview with a login prompt', async () => {
  window.history.replaceState(null, '', '/bank-soal?tampilan=sampah');
  render(() => <App />);
  await screen.findByRole('heading', { name: 'Masuk terlebih dahulu' });
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(mocks.call).not.toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog' }));
});

it('opens the original destination after a successful login', async () => {
  window.history.replaceState(null, '', '/bank-soal?tampilan=sampah');
  render(() => <App />);
  await screen.findByRole('heading', { name: 'Masuk terlebih dahulu' });
  mocks.get.mockResolvedValue({ $id: 'teacher', name: 'Guru' });
  await fireEvent.input(screen.getByLabelText('Email'), {
    target: { value: 'teacher@example.com' },
  });
  await fireEvent.input(screen.getByLabelText('Kata sandi'), {
    target: { value: 'test-password' },
  });
  await fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
  await waitFor(() => expect(window.location.pathname).toBe('/bank-soal'));
  expect(window.location.search).toBe('?tampilan=sampah');
  await waitFor(() => expect(mocks.call).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole('dialog').hasAttribute('data-closed')).toBe(true));
});
