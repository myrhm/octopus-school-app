import { call } from './client';
export function mediaUrl(fileId: string) {
  if (!/^[a-zA-Z0-9._-]{1,36}$/.test(fileId)) return '';
  return (
    import.meta.env.VITE_APPWRITE_ENDPOINT +
    '/storage/buckets/question-media/files/' +
    fileId +
    '/view?project=' +
    encodeURIComponent(import.meta.env.VITE_APPWRITE_PROJECT_ID)
  );
}
export async function uploadMedia(file: File) {
  if (file.size > 1048576) throw new Error('Ukuran gambar maksimal 1 MB.');
  let binary = '';
  for (const byte of new Uint8Array(await file.arrayBuffer())) binary += String.fromCharCode(byte);
  return call<string>('upload', { name: file.name, mime: file.type, content: btoa(binary) });
}
