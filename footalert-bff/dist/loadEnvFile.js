const envFile = process.env.ENVFILE?.trim() || '.env';
try {
    process.loadEnvFile?.(envFile);
}
catch (error) {
    const code = error?.code;
    if (code !== 'ENOENT') {
        throw error;
    }
}
export {};
