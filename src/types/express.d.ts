// 扩展 Express Request，供守卫/拦截器使用
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId?: string; [key: string]: unknown };
    tenantId?: string;
  }
}
