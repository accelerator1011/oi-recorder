# OI Recorder

信息竞赛做题记录工具。记录代码、笔记、提交状态和耗时，查看做题进度。所有记录保存在当前浏览器中，无需后端服务。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vite.dev/)

## 功能

- **记录管理**：新建、编辑和删除记录；按题号、题名、标签搜索，按难度和状态筛选。
- **题目与标签**：可选洛谷题号、8 级难度、自定义算法标签；同一道题可有多条记录。
- **提交状态**：AC、部分分、WA、TLE、MLE、RE、CE；兼容历史数据中的「进行中」。
- **代码与笔记**：支持记录 C++、C、Python、Java、Pascal 代码，其中 C/C++、Python 提供语法高亮；笔记支持 Markdown、表格和数学公式。
- **首页统计**：题目数、已通过题目数、总耗时、进行中题目数，以及难度分布、算法分布、近 7 日趋势和最近记录。
- **备份恢复**：导出包含代码、笔记的 JSON 备份，校验后确认覆盖导入。
- **界面与离线使用**：深浅色主题、响应式布局、默认语言和代码字号设置；PWA 可安装并在缓存完成后离线使用。
- **保存保护**：未保存修改的离开提示；保存失败时回滚整条记录的修改；编辑加载失败时提供重试。

### 统计口径

「已通过」按题目去重，多次 AC 只计一次，并归到首次 AC 的日期。难度分布、算法分布和近 7 日趋势也使用这一口径；算法标签可重叠，因此各标签数量之和可能超过已通过题目数。「进行中」是已有记录但尚无 AC 的题目数。总耗时累加所有记录的耗时。

## 快速开始

### 环境要求

- Node.js：`^22.22.2 || ^24.15.0 || >=26.0.0`，推荐 Node.js 24 LTS（24.15.0 或更新版本）。测试依赖 jsdom 要求这些版本。
- pnpm：9 或更新版本，与仓库的锁文件格式兼容。

```bash
git clone https://github.com/accelerator1011/oi-recorder.git
cd oi-recorder
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器默认地址为 http://localhost:5173；端口被占用时以终端输出为准。

### 常用命令

| 命令                | 说明                                             |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | 启动开发服务器                                   |
| `pnpm build`        | TypeScript 检查并构建，输出到 `dist/`            |
| `pnpm preview`      | 本地预览已构建的生产版本                         |
| `pnpm test`         | 运行回归测试（数据库、统计、工具函数与结构约束） |
| `pnpm type-check`   | 单独运行 TypeScript 检查                         |
| `pnpm lint`         | Oxlint 检查                                      |
| `pnpm lint:fix`     | 自动修复支持的 Lint 问题                         |
| `pnpm format:check` | 检查源码、测试和根目录配置、文档的格式           |
| `pnpm format`       | 格式化上述文件                                   |

测试使用 Node.js 内置测试运行器、fake-indexeddb 和 jsdom，覆盖备份内容保留、保存回滚、并发题号写入、日期校验、编辑加载失败重试、统计口径与颜色工具函数。测试数据库与用户浏览器的数据隔离。

### 部署

将 `pnpm build` 生成的 `dist/` 部署到静态网站托管服务的根路径。使用 HTTPS（本地 localhost 除外）以启用 Service Worker 和 PWA。托管服务需要将 `/records/...` 等前端路由回退到 `index.html`；`public/_redirects` 提供兼容该格式的平台所需的 SPA 配置，`public/_headers` 提供入口和 Service Worker 的缓存配置。其他平台需要配置等效规则。

## 使用说明

### 新建与编辑

1. 点击侧边栏「新建记录」。
2. 填写题名、难度和可选洛谷题号；已有题号会在失焦时填入已有题目信息。
3. 在记录表单中选择或创建算法标签，填写完成日期、非负整数耗时、状态和语言。
4. 输入代码、Markdown 笔记并保存。
5. 在「全部记录」的操作菜单或题目详情中编辑已有记录。

同题号的新记录复用已有题目。题名、难度和标签属于题目，编辑这些字段会影响该题目的所有记录。删除最后一条记录时，题目及其标签关联也会删除，确认框会说明这一点。

### 标签管理

在「标签管理」中创建、重命名和删除标签，查看各标签关联的题目数。在新建或编辑记录的表单中为题目选择标签。删除标签会移除它与题目的关联，不会删除题目或记录。

### 备份与恢复

1. 进入「备份恢复」，点击「导出 JSON」保存全部题目、记录、代码、笔记和标签。
2. 恢复时点击「选择文件导入」。文件先经过结构、ID、关联关系和字段校验。
3. 校验通过后点击「覆盖导入」，用备份替换当前全部记录数据。建议覆盖前先导出当前数据。

导入在事务中执行，失败时保留导入前的数据。历史重复洛谷题号会按原题目 ID 保留各自的记录与标签。备份不包含主题、侧边栏、默认语言和字号设置。

记录按浏览器和站点来源分别存储，不会自动跨设备同步。更换浏览器、域名、协议或端口时，需要导出并重新导入；清除站点数据会删除本地记录，请定期备份。

## 技术栈与结构

- Vite 8、React 19、TypeScript 6、React Router v6。
- Tailwind CSS v3、Radix UI、lucide-react、Framer Motion、sonner。
- Dexie.js、dexie-react-hooks、Zustand。
- CodeMirror、react-markdown、remark-gfm、remark-math、rehype-katex、Recharts。
- vite-plugin-pwa、Oxlint、Prettier；Node.js 测试运行器、fake-indexeddb、jsdom。

```text
src/
  lib/          数据库操作、类型、常量、查询索引和工具函数
  store/        持久化的界面设置
  hooks/        首页与列表页共用的记录数据查询与索引
  components/   侧边栏、代码/笔记编辑器、难度选择器、Markdown 渲染、404 视图、ui/ 基础组件
  pages/        首页、记录列表、记录表单、题目详情、标签、备份、设置
  router.tsx    支持未保存修改拦截的 data router
  App.tsx       布局、懒加载路由、页面过渡和错误边界
  main.tsx      React 入口
  index.css     全局样式
tests/         回归测试和 TypeScript 模块加载辅助代码
public/        图标、静态托管的路由与缓存配置
```

数据库将记录元数据与代码、笔记分表存储，列表与首页只查询元数据。导出的备份仍使用包含代码和笔记的扁平格式。

## 贡献与许可证

提交改动前运行 `pnpm test`、`pnpm lint`、`pnpm format:check` 和 `pnpm build`。这四道门禁与 CI 工作流（`.github/workflows/ci.yml`）完全一致，master 的每次推送与 PR 都会自动跑一遍。仓库协作约定见 [AGENTS.md](AGENTS.md)。

欢迎在 [GitHub](https://github.com/accelerator1011/oi-recorder) 提交 Issue 和 Pull Request。本项目采用 [GPL-3.0](LICENSE) 许可证。
