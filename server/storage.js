// File storage: Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_KEY are set, else local disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = process.env.SUPABASE_BUCKET || 'attachments';
const LOCAL_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

const sb =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

export const storageMode = sb ? 'supabase' : 'local';

export async function initStorage() {
  if (sb) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 20 * 1024 * 1024 });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  } else {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

export async function putFile(key, buffer, mime) {
  if (sb) {
    const { error } = await sb.storage.from(BUCKET).upload(key, buffer, { contentType: mime || 'application/octet-stream' });
    if (error) throw error;
  } else {
    await fs.promises.writeFile(path.join(LOCAL_DIR, key), buffer);
  }
}

export async function getFile(key) {
  if (sb) {
    const { data, error } = await sb.storage.from(BUCKET).download(key);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.promises.readFile(path.join(LOCAL_DIR, key));
}

export async function deleteFile(key) {
  if (sb) await sb.storage.from(BUCKET).remove([key]);
  else await fs.promises.rm(path.join(LOCAL_DIR, key), { force: true });
}
