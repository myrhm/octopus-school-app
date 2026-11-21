import { createClient } from '@supabase/supabase-js';
import { createSignal } from 'solid-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (Boolean(url) !== Boolean(key)) throw new Error('Konfigurasi Supabase belum lengkap.');
export const backend = url && key ? createClient(url, key) : undefined;
export const [school, setSchool] = createSignal('');
