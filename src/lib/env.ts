export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
}

export function getAudioBucket() {
  return process.env.SUPABASE_AUDIO_BUCKET ?? "contest-audio";
}
