import { createApp } from './app';
import { connectDatabase } from './config/database.config';
import { config, checkEnvironment } from './config/app.config';

const startServer = async (): Promise<void> => {
  checkEnvironment();
  await connectDatabase();
  if (process.env.INFRASTRUCTURE_ENABLED === 'true') {
    const { initInfrastructure } = await import('./modules/infrastructure/infra.init');
    await initInfrastructure().catch((err) => {
      console.warn('Infrastructure init warning:', err);
    });
  }
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${config.port} is already in use.`);
      process.exit(1);
    }
    throw err;
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
