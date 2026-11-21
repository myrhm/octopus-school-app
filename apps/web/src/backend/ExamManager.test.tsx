import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ local: vi.fn(), drafts: vi.fn(), copy: vi.fn(), call: vi.fn() }));
vi.mock('./client', () => ({ call: mocks.call }));
vi.mock('./BankLibrary', () => ({ BankContents: () => null }));
vi.mock('../features/question-import/draft-store', () => ({
  listDrafts: mocks.drafts,
  listLocalRecords: mocks.local,
  importLocalRecord: mocks.copy,
}));
import ExamManager from './ExamManager';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.drafts.mockResolvedValue([]);
  mocks.call.mockResolvedValue([]);
  mocks.local.mockResolvedValue([
    ...[1, 2, 3].map((id) => ({
      id: String(id),
      title: 'Impor soal baru',
      formatVersion: 2,
      questionCount: id,
      updatedAt: '2026-11-21T01:00:00Z',
    })),
    { id: 'trash', title: 'Draft terhapus', formatVersion: 3 },
  ]);
});
it('shows separate draft identities and prevents copying an imported draft again', async () => {
  render(() => <ExamManager />);
  await screen.findByRole('heading', { name: 'Draft di browser ini' });
  expect(screen.getAllByRole('heading', { name: 'Impor soal baru' })).toHaveLength(3);
  expect(screen.queryByText('Draft terhapus')).toBeNull();
  const buttons = screen.getAllByRole('button', { name: 'Salin ke sekolah' });
  expect(buttons).toHaveLength(3);
  await fireEvent.click(buttons[0]!);
  await screen.findByRole('button', { name: 'Sudah ada di sekolah' });
  expect(mocks.copy).toHaveBeenCalledTimes(1);
  expect(mocks.copy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  expect(screen.getAllByRole('button', { name: 'Salin ke sekolah' })).toHaveLength(2);
});
it('shows a useful connection error and allows retrying the same draft', async () => {
  mocks.copy.mockRejectedValue(new TypeError('Failed to fetch'));
  render(() => <ExamManager />);
  const buttons = await screen.findAllByRole('button', { name: 'Salin ke sekolah' });
  await fireEvent.click(buttons[1]!);
  await screen.findByText('Draft belum tersalin. Periksa koneksi, lalu coba lagi.');
  await waitFor(() => expect(buttons[1]!.hasAttribute('disabled')).toBe(false));
  expect(screen.queryByText('Failed to fetch')).toBeNull();
});
