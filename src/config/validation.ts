import * as Joi from 'joi';

export const envSchema = Joi.object({
  // 数据库
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  // Redis
  REDIS_URL: Joi.string().uri().required(),
  // meilisearch
  MEILI_HOST: Joi.string().uri().required(),
  MEILI_KEY: Joi.string().required(),
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
});
