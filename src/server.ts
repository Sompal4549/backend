import { createApp } from './app.js';
import { connectDatabase } from './config/database.config.js';
import { config } from './config/app.config.js';

const startServer = async (): Promise<void> => {
  await connectDatabase();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
