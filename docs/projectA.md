下面对项目 A（NestJS 完整版）按阶段逐步细化，覆盖实体设计、接口定义、校验、缓存/队列/搜索、测试与运维安全要点。你可按阶段增量交付与验证。

## 阶段 0：脚手架与基础设施

- 初始化
  - `nest new app`；配置路径别名、ESLint/Prettier；设置 `src/main.ts` 全局前缀 `/api`。
  - 环境：`.env.development/.env.test/.env.production`；用 `@nestjs/config`，在启动时校验必需变量（DB_HOST/PORT/USER/PASS/DB_NAME/REDIS_URL/MEILI_HOST/MEILI_KEY/JWT_SECRET/JWT_REFRESH_SECRET）。
- TypeORM + Postgres
  - 开启迁移脚本（TypeORM CLI 或自写迁移 runner）。
  - 全局开启 `namingStrategy`（snake_case）。
- 全局能力
  - 管道：`ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`。
  - 异常过滤器：统一错误响应（code/message/errors）。
  - 拦截器：日志（记录 method/path/status/duration/req-id/tenant-id/user-id）、耗时。
  - 守卫骨架：JWT 守卫（解析 userId）、Tenant 守卫（解析 tenantId）。
  - Swagger：基础分组、Bearer auth。
- 基础中间件
  - Helmet/CORS，RequestId（若无网关），限流（可后置到阶段 7）。
  - Cache 管理：`@nestjs/cache-manager` + Redis 驱动。
  - 队列：BullMQ 全局注册（default queue）。
  - 健康检查：`/health`（DB ping、Redis ping、队列连通）。

## 阶段 1：账号与租户

- 实体
  - `users`：id, email(unique), password_hash, name, created_at, updated_at
  - `tenants`：id, name, created_at
  - `memberships`：id, user_id, tenant_id, role(enum: owner/admin/member), created_at
  - `refresh_tokens`（可选表存储黑名单/设备）：id, user_id, token, expires_at
- DTO/校验
  - 注册/登录 DTO：email 格式、密码长度；租户创建 DTO：name。
- 业务规则
  - 注册：创建 user + tenant + membership(owner)。
  - 登录：校验密码（bcrypt/argon2）→ 签发 access/refresh。
  - 刷新：校验 refresh，重签 access。
  - 鉴权：JWT 提供 userId；Tenant 由 header `x-tenant-id` 或子域解析，守卫校验 membership + 角色。
- 接口
  - `POST /auth/register`，`POST /auth/login`，`POST /auth/refresh`
  - `GET /me`
  - `POST /tenants`，`GET /tenants/:id/members`，`POST /tenants/:id/members`（添加成员/角色变更）
- 测试
  - 单测：AuthService（hash/compare、token 过期）、TenantGuard。
  - e2e：注册→登录→带 token 访问 `/me`，跨租户访问应拒绝。

## 阶段 2：文档与评论

- 实体
  - `documents`：id, tenant_id, title, content(text/json), version(int), updated_by, created_at, updated_at
  - `comments`：id, doc_id, user_id, body, created_at
- 业务规则
  - 文档 CRUD；更新用乐观锁 `version`，冲突返回 409。
  - 热门/最近文档列表缓存（Redis，key: `doc:list:${tenant}`，失效 60~300s）。
  - 评论分页，限速（同用户/同文档 N 条/分钟）。
- 接口
  - `POST /docs`，`GET /docs`（分页）`GET /docs/:id`，`PUT /docs/:id`（需 version），`DELETE /docs/:id`
  - `GET /docs/:id/comments`（分页），`POST /docs/:id/comments`，`DELETE /comments/:id`
- 测试
  - e2e：创建文档→更新 version 正常，错误 version 409；评论分页。
  - 缓存：更新/删除后缓存失效用例。

## 阶段 3：任务与通知

- 实体
  - `tasks`：id, tenant_id, title, description, status(enum: todo/doing/done), assignees(jsonb user_id[]), due_date, created_by, updated_at
  - `notifications`：id, user_id, type(enum: task_assigned|comment_reply|custom), payload(jsonb), read(boolean), created_at
- 业务规则
  - 任务状态流转校验；指派写入 assignees。
  - 任务事件入队（BullMQ），消费者生成通知记录（模拟邮件/站内信）。
- 接口
  - `POST /tasks`，`GET /tasks`（过滤 status/assignee），`GET /tasks/:id`，`PATCH /tasks/:id`（状态/指派）`DELETE /tasks/:id`
  - `GET /notifications`（分页/未读），`PATCH /notifications/:id/read`
- 测试
  - e2e：任务创建→更新状态→通知入队→消费者落库→查询通知。
  - 单测：队列处理器，状态流转校验。

## 阶段 4：文件上传与访问

- 存储抽象
  - 接口 `FileStorage`：`initUpload`, `uploadChunk`, `completeUpload`, `getStream`。
  - 开发环境用本地 `fs` 路径；未来可换 S3/OSS。
- 实体
  - `files`：id, tenant_id, filename, size, mime, status(enum: uploading/ready), storage_path, created_by, created_at
- 业务规则
  - 分片上传（chunk 序号、md5 可选），合并后标记 ready。
  - 下载需鉴权（同租户）；可选签名 URL（HMAC+过期时间）。
  - MIME/魔数校验，大小限制。
- 接口
  - `POST /files/init`（返回 uploadId）
  - `POST /files/:id/chunk`（multipart or binary body）
  - `POST /files/:id/complete`
  - `GET /files/:id`（流式下载，支持 Range）
- 测试
  - e2e：分片上传→合并→下载；越权访问拒绝。
  - 单测：存储适配器。

## 阶段 5：搜索与审计

- 搜索（Meilisearch）
  - 索引：`documents`（id, tenant_id, title, content 摘要, updated_at），`tasks`（id, tenant_id, title, description, status）
  - 同步策略：创建/更新/删除时入队同步；消费者调用 Meili。
  - 接口：`GET /search?q=...&type=document|task&tenant=...`
- 审计
  - 实体 `audit_logs`：id, actor_id, tenant_id, action, entity, entity_id, meta(jsonb), ts
  - 拦截器/服务：对关键操作（auth/tenant/member/doc/task/file）记录审计，可异步入队。
  - 接口：`GET /audit?entity=...&actor=...&range=...`（受限于管理员角色）
- 测试
  - e2e：创建文档→搜索可命中；删除后搜索失效。审计查询过滤。

## 阶段 6：实时与网关

- WebSocket（Gateway）
  - 鉴权：连接参数携带 JWT；校验 tenant_id。
  - 房间：`tenant:{id}:doc:{id}`，`tenant:{id}:task:{id}`
  - 事件：`comment:new`，`task:update`
  - 心跳/断线清理；消息频率限速。
- 测试
  - e2e：连接→订阅文档房间→发评论→收到推送。
  - 单测：网关守卫/适配器。

## 阶段 7：运维与安全

- 安全头：Helmet + 自定义 CSP（nonce/sha256），`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`
- 限流：全局（IP），敏感接口（登录/文件上传）额外限流；可按租户维度。
- CORS：白名单域。
- 日志与追踪：请求 ID（header 透传/生成），结构化日志；错误日志分级。
- 健康与监控：`/health`（DB/Redis/Queue/Meili）；`/metrics`（Prometheus 风格，可选中间件）。
- 优雅停机：监听 SIGTERM，关闭 HTTP、队列、WS，断开 DB/Redis。
- 配置管理：区分 dev/prod 行为（如详细错误只在 dev 暴露）。

## 阶段 8：测试与质量

- 单元测试
  - Service：Auth/Doc/Task/File/Search/Audit
  - Guard/Pipe/Interceptor/Filter：验证逻辑与错误格式
- e2e 测试
  - Auth 流程；租户隔离；文档 CRUD + version 冲突；任务 + 通知；文件上传下载；搜索；WS 推送
- 迁移测试：向上/向下迁移，确保表结构一致
- 性能小压测（可选）
  - 对比 Nest Express vs Fastify：常见接口 QPS/延迟；开启/关闭缓存的差异

## 目录建议

- `src/main.ts`（bootstrap、全局中间件/管道）
- `src/config`（配置 schema/validation）
- `src/common`（guards/interceptors/filters/pipes/decorators/dtos）
- `src/modules/*`（auth/user/tenant/document/comment/task/notification/file/search/audit）
- `src/infra`（db/typeorm, redis/cache, queue/bullmq, search/meili, storage adapters）
- `src/gateway`（ws gateway）
- `src/jobs`（queue processors/schedulers）
- `test`（unit/e2e）

如果需要进一步把每个接口的字段、响应示例、错误码约定或具体的迁移脚本模板列出来，可以再细化到接口/表字段级别。
