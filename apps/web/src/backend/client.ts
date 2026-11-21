import { Client, Account, Teams, Functions, AppwriteException, Query } from 'appwrite';
import { createSignal } from 'solid-js';
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const project = import.meta.env.VITE_APPWRITE_PROJECT_ID;
if (Boolean(endpoint) !== Boolean(project)) throw new Error('Konfigurasi Appwrite belum lengkap.');
const client =
  endpoint && project ? new Client().setEndpoint(endpoint).setProject(project) : undefined;
export const backend = client
  ? { account: new Account(client), teams: new Teams(client), functions: new Functions(client) }
  : undefined;
export const [school, setSchool] = createSignal('');
export async function schools() {
  const list: { id: string; name: string }[] = [];
  for (;;) {
    const page = await backend!.teams.list({
      queries: [
        Query.limit(100),
        ...(list.length ? [Query.cursorAfter(list[list.length - 1]!.id)] : []),
      ],
    });
    list.push(...page.teams.map((t) => ({ id: t.$id, name: t.name })));
    if (page.teams.length < 100) return list;
  }
}
export async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const result = await backend!.functions.createExecution({
    functionId: 'octopus',
    body: JSON.stringify({ school: school(), ...params, action }),
    async: false,
  });
  if (result.responseStatusCode !== 200)
    throw new AppwriteException(
      'Permintaan gagal (' + result.responseStatusCode + ').',
      result.responseStatusCode,
    );
  return JSON.parse(result.responseBody);
}
