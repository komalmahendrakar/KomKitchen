import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { createApp } from './app';
import { initSocketIO } from './socket';
import { runMigrations } from './db/migrate';
import { seedMenu } from './db/seed';
import { MenuRepository } from './repositories/menu.repository';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function bootstrap() {
  try {
    // 1. Run migrations safely
    await runMigrations();

    // 2. Check and seed menu items if empty
    const items = await MenuRepository.getAllMenuItems();
    if (items.length === 0) {
      await seedMenu();
    }

    // 3. Create HTTP & Socket.IO server
    const app = createApp(CLIENT_URL);
    const httpServer = http.createServer(app);
    initSocketIO(httpServer, CLIENT_URL);

    httpServer.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Live Kitchen Server running on port ${PORT}`);
      console.log(`📡 Socket.IO enabled for client: ${CLIENT_URL}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
