const envFile = process.env.ENVFILE?.trim() || '.env';

try {
  process.loadEnvFile?.(envFile);
} catch (error) {
  const code = (error as { code?: string } | undefined)?.code;
  if (code !== 'ENOENT') {
    throw error;
  }
}
