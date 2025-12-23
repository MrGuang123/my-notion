#!/usr/bin/env node
/**
 * 用法：
 *   yarn migration:gen InitSchema   // 生成迁移，文件输出到 src/migrations
 *   yarn migration:run              // 执行未跑过的迁移
 *   yarn migration:rev              // 回滚最近一条迁移
 *
 * 可选：NODE_ENV=production yarn migration:run  指定环境，默认 development
 */
const { spawnSync } = require('node:child_process');

const action = process.argv[2];
const name = process.argv[3];
const env = { ...process.env };
if (!env.NODE_ENV) env.NODE_ENV = 'development';

const baseCmd = 'typeorm-ts-node-commonjs';
const baseArgs = ['-d', 'src/infra/database/data-source.ts'];

const run = (args) => {
  const r = spawnSync(baseCmd, baseArgs.concat(args), {
    stdio: 'inherit',
    env,
  });
  process.exit(r.status ?? 1);
};

switch (action) {
  case 'gen':
    if (!name) {
      console.error('usage: yarn migration:gen <Name>');
      process.exit(1);
    }
    run(['migration:generate', '-o', 'src/migrations', '-n', name]);
    break;
  case 'run':
    run(['migration:run']);
    break;
  case 'rev':
    run(['migration: revert']);
    break;
  default:
    console.error('usega: yarn migration:[gen|run|rev] [Name]');
    process.exit(1);
}

