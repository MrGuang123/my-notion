import * as path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { makeBaseTypeOrmConfig } from './db-config';

dotenv.config({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
const base = makeBaseTypeOrmConfig(process.env);

// 执行migration需要的数据库实例
export const AppDataSource = new DataSource({
  ...base,
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
});
