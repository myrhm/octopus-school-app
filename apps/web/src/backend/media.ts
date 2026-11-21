import { call, school } from './client';
import { compressImage } from './image-compression';
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
  const schoolId = school();
  if (!schoolId) throw new Error('Pilih sekolah sebelum mengunggah gambar.');
  const compressed = await compressImage(file);
  let binary = '';
  for (const byte of new Uint8Array(await compressed.arrayBuffer()))
    binary += String.fromCharCode(byte);
  return call<string>('upload', {
    school: schoolId,
    name: compressed.name,
    mime: compressed.type,
    content: btoa(binary),
  });
}
