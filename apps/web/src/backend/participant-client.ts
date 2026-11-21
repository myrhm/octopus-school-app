export async function participantCall<T>(
  exam: string,
  action: string,
  input: Record<string, unknown> = {},
): Promise<T> {
  const key = 'octopus-cookie-scope:' + exam;
  let tab = sessionStorage.getItem(key);
  if (!tab) {
    tab = crypto.randomUUID();
    sessionStorage.setItem(key, tab);
  }
  const response = await fetch('/api/participant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, exam, action, tab }),
  });
  if (!response.ok)
    throw Object.assign(new Error('Permintaan peserta gagal.'), { code: response.status });
  return response.json();
}
