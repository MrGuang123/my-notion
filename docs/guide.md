## 项目 A（NestJS 完整版，工程化为主）

**基础信息**

- 运行时：Node 18+（ESM/CJS 均可），Nest + TypeORM + Postgres + Redis（缓存/队列）+ Meilisearch（全文搜索）
- 领域：多租户协作文档/任务平台（用户、租户、文档、评论、任务、通知、文件、审计）

**阶段 0：脚手架与基础设施**

- 初始化 Nest 项目，启用 `@nestjs/config`，分环境 .env（dev/stage/prod），必填变量启动即校验
- 接入 TypeORM（Postgres 连接、迁移脚本），建立基础实体
- 接入 Swagger/OpenAPI，基础全局管道（验证/转换）、全局异常过滤器、全局拦截器（日志/耗时）、全局守卫骨架
- 接入缓存（Redis + cache-manager），队列（BullMQ + Redis），健康检查 `/health`，基础 logger（pino/winston）

**阶段 1：账号与租户**

- 实体/表：User, Tenant, Membership (user_id, tenant_id, role)
- 功能：
  - 注册/登录/刷新 token（JWT + Refresh），密码哈希（bcrypt/argon2）
  - 多租户隔离：请求上下文携带 tenant_id（header/域名），守卫校验成员身份与角色
  - RBAC：roles（owner/admin/member），资源访问校验
- 接口：`POST /auth/register`，`POST /auth/login`，`POST /auth/refresh`；`GET /me`；`POST /tenants`，`GET /tenants/:id/members`，`POST /tenants/:id/members`

**阶段 2：文档与评论**

- 实体：Document(id, tenant_id, title, content, version, updated_by)，Comment(doc_id, user_id, body)
- 功能：
  - 文档 CRUD，乐观锁/version 字段；最近列表分页；热门文档缓存
  - 评论增删查，分页；防刷（节流/限流）
- 接口：`/docs` CRUD；`/docs/:id/comments` CRUD
- 缓存：热门文档列表、单文档快取（失效策略：更新/删除时清理）

**阶段 3：任务与通知**

- 实体：Task(id, tenant_id, title, status, assignees, due), Notification(id, user_id, type, payload, read)
- 功能：
  - 任务创建/指派/状态流转；事件入队（BullMQ）触发通知
  - 通知：站内消息列表，标记已读
- 接口：`/tasks` CRUD + 状态流转，`/notifications` 列表/已读
- 队列：任务事件 -> 通知发送（模拟邮件/站内信）

**阶段 4：文件上传与访问**

- 功能：分片上传/合并，大小与 MIME 校验，生成带有效期的下载签名 URL
- 存储：本地磁盘（dev）/对象存储接口（抽象，便于未来换 S3/OSS）
- 接口：`POST /files/init`，`POST /files/:id/chunk`，`POST /files/:id/complete`，`GET /files/:id`（校验签名）

**阶段 5：搜索与审计**

- 搜索：Meilisearch 索引文档（title/content），任务（title/desc）；新增/更新/删除时异步更新索引
- 审计：AuditLog(entity, entity_id, action, actor, meta, ts)，重要操作写审计（可通过队列异步落库）
- 接口：`GET /search?q=...&type=document|task`；`GET /audit?entity=...`

**阶段 6：实时与网关**

- WebSocket（Nest Gateway）：文档评论/任务状态推送，房间按 tenant_id/doc_id 或 task_id 分组
- 限流/鉴权：WS 连接时验证 JWT/租户；消息频率控制

**阶段 7：运维与安全**

- 安全头/CSP、Helmet；限流（全局和按租户）；CORS 配置
- 健康检查与 metrics（Prometheus 风格）；请求 ID/链路日志
- 优雅停机：队列/WS/HTTP 关闭；数据库连接回收

**阶段 8：测试与质量**

- 单测：Service/Guard/Pipe/Interceptor
- e2e：Auth/Docs/Tasks/WS 烟测
- 迁移测试：数据库迁移上下行验证

---

## 项目 B（原生 Node 对照版，能力演练为主，功能缩减）

**基础信息**

- 运行时：Node 18+，无框架或用极轻路由（可选 Fastify/自写 http 服务器），TypeORM + Postgres，Redis（缓存/队列 BullMQ），可选 Meilisearch（仅文档索引）

**建议功能子集**

- 用户 + 简单租户（仅 owner/member），登录 JWT
- 文档 CRUD + 评论；任务 CRUD；文件上传（单文件/分片二选一简化）
- 简单搜索（Meilisearch 可选）
- WebSocket：广播评论或任务更新

**演练点（原生能力）**

- HTTP/HTTPS：用原生 `http.createServer` 写健康检查/静态文件；对照一个轻路由实现
- 流与文件：分片上传/合并，断点续传，`fs` 流式下载（支持 Range）
- Buffer/安全：JWT 签名校验，HMAC 请求签名示例；魔数检测文件类型
- Crypto：密码哈希（bcrypt/argon2），HMAC 校验
- 事件与队列：`EventEmitter` 做应用事件，BullMQ 做异步通知；对比同步处理的延迟
- Worker 线程：CPU 密集任务（如文本摘要/markdown 渲染）放 worker_threads；对比阻塞
- WebSocket：用 `ws` 管理连接、心跳、房间；简单限速
- 定时任务：`node-cron` 定期清理临时文件/重建搜索索引
- 观测：`perf_hooks`/`process.memoryUsage()` 打点；结构化日志

**最小模块与接口**

- Auth：`POST /auth/login`，JWT；用户表 User
- Tenant（可选简化）：`POST /tenant`，`GET /tenant/members`
- Docs/Comments：`/docs` CRUD，`/docs/:id/comments` CRUD
- Tasks：`/tasks` CRUD + 状态更新
- Files：`/files` 上传/下载（简化，不做签名 URL 也可）
- Search（可选）：`/search?q=...`
- WS：`/ws` 路径，事件 `comment:new` / `task:update`

**测试与对照**

- 基础单测：自写路由/服务函数的单测
- 压测对照：同一接口在“原生/轻路由” vs “Nest（Express/Fastify）”下的 QPS/延迟差异
- 资源占用对照：看内存、CPU、冷启动时间

---

### 建议执行顺序

- 先做项目 A（Nest）：按阶段 0→1→2→… 完成核心链路。
- 项目 B 仅挑关键能力做对照（HTTP 基础、文件流、WS、队列、worker_threads），不必完全复刻业务规模。
- 当 Nest 主线稳定后，再针对若干接口做性能对照：Nest(Express) vs Nest(Fastify) vs 原生/轻路由。
