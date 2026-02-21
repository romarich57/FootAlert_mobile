import { env } from './config/env.js';
import { buildServer } from './server.js';

async function start() {
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
