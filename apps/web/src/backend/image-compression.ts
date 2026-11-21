const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const imageUploadLimit = 500 * 1024;
const targetBytes = 250 * 1024;
const inputLimit = 20 * 1024 * 1024;

async function decode(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      /* Try the browser image decoder before reporting a corrupt file. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error('Gambar tidak dapat dibaca. Pilih file PNG, JPG, atau WebP yang valid.'));
      image.src = url;
    });
    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new Error(
              'Gambar belum dapat dikompres. Coba gambar lain atau ukuran yang lebih kecil.',
            ),
          );
      },
      'image/webp',
      quality,
    ),
  );
}

/** Re-encode before upload; never send a large original as a fallback. */
export async function compressImage(file: File): Promise<File> {
  if (!allowedTypes.has(file.type)) throw new Error('Gunakan gambar PNG, JPG, atau WebP.');
  if (!file.size || file.size > inputLimit)
    throw new Error('File sumber maksimal 20 MB. Pilih gambar yang lebih kecil.');
  const image = await decode(file);
  const canvas = document.createElement('canvas');
  try {
    if (!image.width || !image.height || image.width * image.height > 40_000_000)
      throw new Error(
        'Resolusi gambar terlalu besar. Potong gambar ke bagian yang diperlukan terlebih dahulu.',
      );
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser ini belum dapat memproses gambar. Coba browser lain.');
    let best: Blob | undefined;
    let previousSize = '';
    for (const edge of [1600, 1280, 1024]) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const size = `${width}x${height}`;
      if (size === previousSize) continue;
      previousSize = size;
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image.source, 0, 0, width, height);
      for (const quality of [0.84, 0.76, 0.68, 0.6]) {
        const blob = await encode(canvas, quality);
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= targetBytes) break;
        // PNG fallback is lossless; changing quality cannot reduce it.
        if (blob.type === 'image/png') break;
      }
      if (best && best.size <= targetBytes) break;
    }
    if (!best || best.size > imageUploadLimit)
      throw new Error(
        'Hasil kompresi masih di atas 500 KB. Potong gambar atau gunakan gambar yang lebih sederhana agar tetap terbaca.',
      );
    const extension = best.type === 'image/webp' ? 'webp' : 'png';
    const basename = file.name.replace(/\.[^.]+$/, '') || 'gambar';
    return new File([best], basename + '.' + extension, {
      type: best.type,
      lastModified: Date.now(),
    });
  } finally {
    image.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
