import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env file
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'safo',
  password: process.env.DB_PASSWORD || 'safo_password',
  database: process.env.DB_NAME || 'safo_db',
  synchronize: false,
  logging: true,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  subscribers: [],
});
