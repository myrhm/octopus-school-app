import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  teams: vi.fn(),
  createTeam: vi.fn(),
}));
vi.mock('./client', async () => {
  const { createSignal } = await import('solid-js');
  const [school, setSchool] = createSignal('');
  return {
    backend: {
      account: {
        get: mocks.get,
        create: mocks.create,
        createEmailPasswordSession: mocks.login,
        deleteSession: mocks.logout,
      },
      teams: { create: mocks.createTeam },
    },
    school,
    setSchool,
    schools: mocks.teams,
  };
});
import SchoolGate, { SchoolSession, AccountControls } from './SchoolGate';
import { setSchool } from './client';

beforeEach(() => {
  vi.resetAllMocks();
  setSchool('');
  mocks.get.mockRejectedValue(new Error('No session'));
  mocks.teams.mockResolvedValue([]);
});
function setup() {
  render(() => (
    <SchoolSession>
      <AccountControls />
      <SchoolGate>
        <p>Private workspace</p>
      </SchoolGate>
    </SchoolSession>
  ));
}
it('registers an account, starts a session and creates a school with teacher access', async () => {
  setup();
  await fireEvent.click(await screen.findByRole('button', { name: 'Daftar akun' }));
  await fireEvent.input(screen.getByLabelText('Nama lengkap'), { target: { value: 'Guru Baru' } });
  await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  await fireEvent.input(screen.getByLabelText('Kata sandi'), {
    target: { value: 'test-password-123' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }));
  expect(screen.getByLabelText('Kata sandi').getAttribute('type')).toBe('text');
  mocks.get.mockResolvedValue({ $id: 'new-user', name: 'Guru Baru' });
  await fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
  await screen.findByRole('heading', { name: 'Buat ruang sekolah' });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Buat sekolah' }).hasAttribute('disabled')).toBe(
      false,
    ),
  );
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'new@example.com',
      password: 'test-password-123',
      name: 'Guru Baru',
    }),
  );
  expect(mocks.login).toHaveBeenCalledWith({
    email: 'new@example.com',
    password: 'test-password-123',
  });
  mocks.createTeam.mockResolvedValue({ $id: 'new-school' });
  mocks.teams.mockResolvedValue([{ id: 'new-school', name: 'Sekolah Baru' }]);
  await fireEvent.input(screen.getByLabelText('Nama sekolah'), {
    target: { value: 'Sekolah Baru' },
  });
  await fireEvent.submit(screen.getByLabelText('Nama sekolah').closest('form')!);
  await screen.findByText('Private workspace');
  expect(mocks.createTeam).toHaveBeenCalledWith(
    expect.objectContaining({ roles: ['owner', 'teacher', 'admin'] }),
  );
});
it('reports login errors without exposing the private workspace', async () => {
  setup();
  const buttons = await screen.findAllByRole('button', { name: 'Masuk' });
  await fireEvent.click(buttons[0]!);
  mocks.login.mockRejectedValue(new Error('Invalid credentials'));
  await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'wrong@example.com' } });
  await fireEvent.input(screen.getByLabelText('Kata sandi'), {
    target: { value: 'wrong-password' },
  });
  await fireEvent.submit(screen.getByLabelText('Email').closest('form')!);
  expect((await screen.findByRole('alert')).textContent).toContain('Login gagal');
  expect(screen.queryByText('Private workspace')).toBeNull();
});
it('clears school access when signing out', async () => {
  mocks.get.mockResolvedValue({ $id: 'teacher', name: 'Guru' });
  mocks.teams.mockResolvedValue([{ id: 'school', name: 'Sekolah' }]);
  setSchool('school');
  setup();
  await screen.findByText('Private workspace');
  await fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));
  await waitFor(() => expect(screen.queryByText('Private workspace')).toBeNull());
  expect(mocks.logout).toHaveBeenCalledWith({ sessionId: 'current' });
});
