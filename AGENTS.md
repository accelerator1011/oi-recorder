# OI Recorder — 仓库指南

## 环境与命令

使用 pnpm，并提交 `pnpm-lock.yaml`。锁文件要求 pnpm 9 或更新版本。
Node.js 需满足 `^22.22.2 || ^24.15.0 || >=26.0.0`（jsdom 测试依赖决定了这一最低版本）。
推荐 Node.js 24 LTS，24.15.0 或更新版本。

| 命令                                | 用途                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`    | 按锁文件安装依赖                                                   |
| `pnpm dev`                          | 启动 Vite 开发服务器                                               |
| `pnpm build`                        | 跑 TypeScript 检查并把 PWA 构建到 `dist/`                          |
| `pnpm preview`                      | 构建完成后本地预览生产版本                                         |
| `pnpm test`                         | 运行 `tests/*.test.cjs` 里的 Node.js 回归测试                      |
| `pnpm type-check`                   | 只跑 TypeScript 检查，不产出                                       |
| `pnpm lint` / `pnpm lint:fix`       | 用 Oxlint 检查 / 应用其自动修复                                    |
| `pnpm format:check` / `pnpm format` | 检查 / 格式化源码、测试，以及根目录的 TypeScript、JSON 与 Markdown |

改完代码要跑 `pnpm test`、`pnpm lint`、`pnpm format:check` 和 `pnpm build`。
只改文档时，跑 `pnpm format:check`，并对照代码核实文档里写的命令与界面文案。
Lint 必须没有错误也没有警告；发现问题就修，而不是关掉项目级规则。

## 技术栈

- Vite 8、React 19、TypeScript 6；React Router v6 data router
- Tailwind CSS v3、Radix UI 原语组件、lucide-react、Framer Motion、sonner
- Dexie.js 与 dexie-react-hooks 负责 IndexedDB；Zustand 配 persist 存放 UI 设置
- CodeMirror 经由 @uiw/react-codemirror；C/C++ 与 Python 语法高亮
- react-markdown、remark-gfm、remark-math 与 rehype-katex 负责笔记与公式
- Recharts；vite-plugin-pwa；Oxlint；Prettier 配 prettier-plugin-tailwindcss
- Node.js 测试运行器、fake-indexeddb 与 jsdom 用于回归测试

## 项目结构

```text
src/
  lib/          types.ts、constants.ts、db.ts、selectors.ts、utils.ts
  store/        useStore.ts（主题、侧边栏、默认语言与代码字号）
  components/   Sidebar、CodeEditor、MarkdownEditor、ConfirmDialog、LoadingState、ui/ 原语组件
  pages/        Dashboard、RecordList、RecordForm、ProblemDetail、Tags、Backup、Settings、NotFound
  router.tsx    useBlocker 所依赖的数据路由
  App.tsx       布局、懒加载页面路由、转场动画与错误边界
  main.tsx      React 入口
  index.css     全局样式与 KaTeX 样式
tests/         数据库、统计与表单回归测试；helpers.cjs 负责加载 TypeScript 源码
public/        图标与静态托管的 SPA / 缓存配置
```

## 数据与行为约束

- 所有记录都存在浏览器的 `OiRecorderDB` IndexedDB 数据库里；UI 设置存在 localStorage。
- problems、tags、problemTags、attempts 存放元数据；attemptContents 以 attempt 的 id 为主键存放代码与笔记。列表与统计应只查元数据，不要把所有内容都读进内存。
- 保存表单一律走 `saveRecord`。题目字段、标签、记录元数据与内容必须一起提交。洛谷题号的查重与写入要留在同一个读写事务里，才能保证并发安全。
- 通过 Dexie 版本化迁移保住用户已有数据库。历史遗留的重复洛谷题号必须仍然可读可恢复；备份里的关联关系使用数字 id。没有为存量重复题号准备好迁移之前，不要给洛谷题号加唯一索引。v3 升级把内联的 `code`/`notes` 搬进 `attemptContents`，对 v1 与 v2 的库同样要生效。
- 备份格式是 version 1，代码与笔记内联在每条记录里。必须在确认覆盖之前校验文件；必须在清空任何表之前挡下缺少 id 的记录。所有表在同一个事务里导入。`createdAt` 解析不了时归一为当前时间，而不是拒绝整份备份：它既不参与排序也不展示，为它拒绝恢复不划算，丢掉创建时间更划算。
- 日期使用本地 `YYYY-MM-DD` 字符串。在表单与数据库写入两个边界校验真实存在的日历日期。
- 编辑一条记录会同时改到它所属题目的题名、难度与标签。删掉某题最后一条记录会连带删除该题目及其标签关联；必须保留明确的二次确认。
- `tags` 在 `name` 上有唯一索引，所以 `createTag` 与 `updateTag` 要先自行校验，抛出用户能看懂的提示，而不是让底层的 Dexie `ConstraintError` 漏到界面上。把标签改成它自己的当前名字按无操作处理，不算重名。
- `setProblemTags` 必须拒绝标签行已经不存在的 id：表单里只存着 id，标签可能已在另一个标签页被删掉。因此 `saveRecord` 的事务作用域必须包含 `db.tags`——Dexie 不允许嵌套事务访问父事务未声明的表。
- 通过题数按题目去重，且统一归到该题首次 AC 的那天。有记录但还没有 AC 的题目算进行中。难度分布、算法分布与七日趋势都只统计通过题。
- 统计口径要留在 `selectors.ts` 里做成纯函数（`computeProblemStats`、`buildWeeklyTrend`、`buildRecentViews`、`filterAttemptViews`），不要写进组件的 `useMemo` 里，这样才可测试。`today` 由调用方传入而不是函数内部读时钟；构建视图数据时不要改动查询结果。
- 题目行已经不存在的记录属于孤立记录：所有题目级统计都要排除它，否则「已通过」卡片会和图表对不上。记录数与总耗时仍然照算。
- 搜索词先 trim 再过滤，纯空白输入表示「不筛选」，而不是把列表过滤成空。
- 保留对应用内跳转与刷新/关闭页面的未保存修改拦截。编辑页加载失败时必须显示错误与重试入口，且不能暴露一个可提交的默认表单。
- `ConfirmDialog` 自己兜住 `onConfirm` 抛出的错误，展示原因并保持对话框打开。调用方仍可自行处理错误，但 rejection 绝不能变成未处理的 promise rejection。
- 每个可交互控件都要有无障碍名称。只有图标的按钮加 `aria-label`；CodeMirror 的可编辑区要设置 `EditorView.contentAttributes`；标签输入框是 `combobox`，它的 `aria-expanded` 必须反映下拉是否真的可见。
- 组件模块只导出组件与类型。从数据库读出的行必然带着自增主键：`db.ts` 的读取函数返回 `WithId<T>`，调用方不该在每个使用点重新怀疑 id 存不存在。构建视图数据时不要改动查询结果。

## 回归测试

`tests/helpers.cjs` 负责把真实的 TypeScript 模块转译后交给 Node.js 测试运行器。
数据库测试让 Dexie 跑在互相隔离的 fake-indexeddb 库上；表单测试用 React + jsdom 并 mock 掉依赖。
测试绝不能读或清空用户浏览器里的数据库。改动回滚、并发写入、备份内容保留、表单错误态这几处行为时，必须同步补测试。
`parseBackupFile` 守着唯一会清空所有表的入口，校验逻辑每改一处，它的每个拒绝分支都要有对应测试。`selectors.ts` 里的统计规则由 `tests/stats.test.cjs` 覆盖，标签命名与关联规则由 `tests/tags.test.cjs` 覆盖。
`tests/migration.test.cjs` 会真的建出 v1 与 v2 的旧库再执行升级：code/notes 迁移只会在用户已有数据上跑，导入测试覆盖不到。
