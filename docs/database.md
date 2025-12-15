## 为什么用迁移，不用synchronize

为什么用迁移（版本化 + 可回滚）
版本化：每次修改表结构（加/删列、索引、约束等）都生成一个带时间戳/序号的迁移文件，记录“从旧版到新版”的具体 SQL/操作。代码库和 DB 结构保持同步，回溯历史时可准确知道每次变更内容。
可回滚：迁移文件通常包含 up 和 down 两个方向。上线后若发现问题，可以执行回滚，数据库结构退回上一版本，降低事故面。
可重复执行：同一套迁移可以在本地、CI、生产多次可靠重放，确保环境一致。
审核性：迁移是文件，能 code review，避免无意的破坏性修改。
自动化：部署流程里插入 migration:run，上线即同步 schema，无需人工手敲 SQL。

synchronize: true 的问题
非可控：它会在启动时根据实体自动变更 DB，缺少审查和 review，生产风险大。
不可回滚：没有 “down” 操作，出问题只能手写 SQL 补救。
不可预测：某些复杂改动（重命名列/表、改类型）会被视为 drop + create，导致数据丢失或锁表。
环境漂移：本地/测试/生产的 DB 状态可能不同，自动同步会把差异带入生产。
部署窗口：应用启动时才改表，可能在服务对外前锁表或失败导致启动中断。

## 工作流
初次引入 TypeORM + 迁移

关闭 synchronize。
写好实体（空表/模型定义）。
运行 yarn migration:generate src/migrations/InitSchema 生成初始迁移。
检查迁移文件内容（确认表/列/索引/约束正确）。
本地执行 yarn migration:run 创建数据库结构。
提交代码 + 迁移文件，一起 review。
迭代修改（新增/修改/删除表、列、索引）

先改实体代码（新增字段/表、改类型等）。
运行 yarn migration:generate src/migrations/AddXxx 生成迁移。
仔细 review 迁移：避免误删数据；必要时手工调整 SQL（如重命名列）。
本地 yarn migration:run，确认通过、功能正常。
提交实体改动 + 迁移文件，发起 PR，团队 review。
部署到测试/生产

部署前确保应用连接到目标库的 env 已就绪。
在 CI/CD 或部署脚本中执行 NODE_ENV=test yarn migration:run（测试库）或 NODE_ENV=production yarn migration:run（生产库）。
若发现问题，执行 ... yarn migration:revert 回滚最新一条迁移；修复后重新生成并发布。
回滚策略

每个迁移文件有 up/down，对应 run/revert。
生产回滚前评估数据影响（删除列/表会丢数据）；必要时备份或写无损迁移（先加新列/复制数据/再删旧列）。
目录和管理

迁移放 src/migrations，按时间戳命名（生成器自动）。
实体放 src/**/**.entity.ts，autoLoadEntities 或在 data-source 中指定。
不要用 synchronize:true，避免自动改表。