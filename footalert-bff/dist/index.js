async function start() {
    // Node >= 20 supports process.loadEnvFile; load local .env automatically in dev.
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
    const { env } = await import('./config/env.js');
    const { buildServer } = await import('./server.js');
    const app = await buildServer();
    await app.listen({
        host: env.host,
        port: env.port,
    });
}
start().catch(error => {
    console.error(error);
    process.exit(1);
});
export {};
