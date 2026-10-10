import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { config } from '../config/env.js';

export interface StorageUploadResult {
  storagePath: string;
  storageProvider: 'supabase' | 'local';
  signedUrl?: string;
}

/**
 * Uploads a document file to Supabase Storage.
 * Falls back to local storage if Supabase is not configured or in test mode.
 */
export async function uploadDocumentToStorage(
  localFilePath: string,
  caseId: string,
  originalFilename: string,
  mimeType: string
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured() || config.NODE_ENV === 'test') {
    return {
      storagePath: localFilePath,
      storageProvider: 'local',
    };
  }

  const fileBuffer = await fs.promises.readFile(localFilePath);
  const randomHex = crypto.randomBytes(8).toString('hex');
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `cases/${caseId}/${Date.now()}-${randomHex}-${safeFilename}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.warn(`Supabase storage upload failed: ${uploadError.message}. Retaining local file.`);
    return {
      storagePath: localFilePath,
      storageProvider: 'local',
    };
  }

  // Clean up local temporary file after successful Supabase upload
  fs.promises.unlink(localFilePath).catch((err) => {
    console.warn(`Could not clean up temporary local file ${localFilePath}: ${err.message}`);
  });

  return {
    storagePath,
    storageProvider: 'supabase',
  };
}

/**
 * Generates a temporary secure signed URL (default 1 hour) for viewing or downloading the document.
 */
export async function getDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(config.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`Failed to create signed URL for ${storagePath}: ${error?.message}`);
      return null;
    }

    return data.signedUrl;
  } catch (err: any) {
    console.warn(`Error generating signed URL: ${err.message}`);
    return null;
  }
}

/**
 * Deletes a document from Supabase Storage.
 */
export async function deleteDocumentFromStorage(
  storagePath: string,
  storageProvider: 'supabase' | 'local'
): Promise<void> {
  if (storageProvider === 'supabase' && isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(config.SUPABASE_STORAGE_BUCKET).remove([storagePath]);
  } else if (storageProvider === 'local') {
    if (fs.existsSync(storagePath)) {
      await fs.promises.unlink(storagePath).catch(() => {});
    }
  }
}
