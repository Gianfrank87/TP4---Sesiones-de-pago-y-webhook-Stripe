type EnvConfig = Record<string, string | undefined>;

const requiredKeys = [
  'PORT',
  'STRIPE_SECRET',
  'STRIPE_SUCCESS_URL',
  'STRIPE_ENDPOINT_SECRET',
] as const;

export function validateEnv(config: EnvConfig) {
  const missing: string[] = requiredKeys.filter((key) => !config[key]);
  const cancelUrl = config.STRIPE_CANCEL_URL ?? config.STRIPE_CANCEL_UR;

  if (!cancelUrl) {
    missing.push('STRIPE_CANCEL_UR');
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  const port = Number(config.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return {
    ...config,
    PORT: String(port),
    STRIPE_CANCEL_URL: cancelUrl,
  };
}
