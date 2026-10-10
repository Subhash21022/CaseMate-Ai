import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseAdminClient: SupabaseClient | null = null;
let supabasePublicClient: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
};

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
};

export const getSupabasePublic = (): SupabaseClient => {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  if (!supabasePublicClient) {
    supabasePublicClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }

  return supabasePublicClient;
};

/**
 * Ensures that the required storage bucket exists in Supabase Storage.
 * Creates it as a private bucket if it doesn't already exist.
 */
export const ensureStorageBucket = async (bucketName: string = config.SUPABASE_STORAGE_BUCKET): Promise<void> => {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn(`Failed to list Supabase storage buckets: ${listError.message}`);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      console.log(`Supabase bucket "${bucketName}" not found. Creating private bucket...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: config.MAX_FILE_SIZE,
      });

      if (createError) {
        console.warn(`Could not create Supabase bucket "${bucketName}": ${createError.message}`);
      } else {
        console.log(`Supabase storage bucket "${bucketName}" created successfully.`);
      }
    }
  } catch (err: any) {
    console.warn(`Error ensuring Supabase storage bucket: ${err.message}`);
  }
};
