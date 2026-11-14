import 'server-only';

export const REQUIRED_ENV = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] as const;
export type RequiredEnv = (typeof REQUIRED_ENV)[number];

export type AwsConfigResult =
  | { ok: true; accessKeyId: string; secretAccessKey: string; region: string }
  | { ok: false; missing: RequiredEnv[] };

export function getAwsConfig(): AwsConfigResult {
  const values: Record<RequiredEnv, string | undefined> = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
  };
  const missing = REQUIRED_ENV.filter((name) => !values[name]?.trim());

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    accessKeyId: values.AWS_ACCESS_KEY_ID!,
    secretAccessKey: values.AWS_SECRET_ACCESS_KEY!,
    region: values.AWS_REGION!,
  };
}
