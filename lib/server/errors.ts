import 'server-only';

import type { ErrorCode } from '@/lib/shared/contracts';

export type BedrockErrorCode = Extract<
  ErrorCode,
  'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'EMPTY_RESPONSE' | 'BEDROCK_ERROR'
>;

type ErrorLike = { name?: unknown; message?: unknown };

function field(error: unknown, key: keyof ErrorLike): string {
  if (typeof error !== 'object' || error === null) return '';
  const value = (error as ErrorLike)[key];
  return typeof value === 'string' ? value : '';
}

function isModelValidationError(error: unknown): boolean {
  if (field(error, 'name') !== 'ValidationException') return false;

  return /on-demand throughput|(?:model|inference profile).*(?:invalid|not found|not supported|unavailable)|(?:invalid|unknown).*(?:model|inference profile)/i.test(
    field(error, 'message'),
  );
}

/** ¿El error dispara el único reintento con el modelo de respaldo? */
export function isRetryableForFallback(error: unknown): boolean {
  const name = field(error, 'name');
  return (
    name === 'AccessDeniedException' ||
    name === 'ThrottlingException' ||
    name === 'ServiceQuotaExceededException' ||
    isModelValidationError(error)
  );
}

/** Traduce un error del SDK a un ErrorCode final. */
export function mapError(error: unknown): BedrockErrorCode {
  const name = field(error, 'name');

  if (name === 'AbortError') return 'TIMEOUT';
  if (name === 'ThrottlingException' || name === 'ServiceQuotaExceededException') {
    return 'QUOTA_EXCEEDED';
  }
  if (
    name === 'AccessDeniedException' ||
    name === 'UnrecognizedClientException' ||
    name === 'InvalidSignatureException' ||
    name === 'ExpiredTokenException' ||
    isModelValidationError(error)
  ) {
    return 'AUTH_ERROR';
  }
  return 'BEDROCK_ERROR';
}
