import { createApp } from './app';
import { connectDatabase } from './config/database.config';
import { config } from './config/app.config';

const startServer = async (): Promise<void> => {
  await connectDatabase();
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
