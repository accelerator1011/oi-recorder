<div align="center">

# OI Recorder

**信息竞赛做题记录工具**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)

一个专为信息学竞赛（OI）选手设计的做题记录管理工具，帮助你系统化地记录、分析和回顾做题过程。

[功能特性](#功能特性) | [快速开始](#快速开始) | [技术栈](#技术栈) | [项目结构](#项目结构)

</div>

---

## 功能特性

### 核心功能

- **做题记录管理** - 记录每道题的解题过程，包括代码、思路、耗时等
- **多状态支持** - 支持 AC、部分分、WA、TLE、MLE、RE、CE 等状态；非 AC 的记录在统计中视为「进行中」
- **多语言支持** - 支持 C++、C、Python、Java、Pascal 等编程语言
- **难度分级** - 8 级难度体系，从入门到 NOI/CTS
- **标签系统** - 自定义算法标签，灵活分类题目
- **洛谷 ID 关联** - 支持关联洛谷题目 ID

### 数据分析

- **仪表盘统计** - 直观展示做题数量、耗时、AC 率等关键指标
- **难度分布图** - 饼图展示各难度级别的题目分布
- **算法分布图** - 柱状图展示各算法类型的做题情况
- **趋势分析** - 折线图展示近 7 日做题趋势

### 数据安全

- **本地存储** - 所有数据存储在浏览器 IndexedDB，无需服务器
- **备份恢复** - 支持 JSON 格式的数据导入导出
- **PWA 支持** - 可安装为桌面应用，支持离线使用

### 用户体验

- **暗色模式** - 支持亮色/暗色主题切换
- **响应式设计** - 适配不同屏幕尺寸
- **流畅动画** - 页面切换平滑过渡
- **代码高亮** - 内置代码编辑器，支持 C++/Python 语法高亮
- **Markdown 支持** - 笔记支持 Markdown 语法，包括数学公式

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 20.19（推荐 22 LTS）
- [pnpm](https://pnpm.io/) >= 8 (推荐)

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/oi-recorder.git
cd oi-recorder

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173 查看应用。

### 构建

```bash
# 类型检查 + 构建
pnpm build

# 预览构建结果
pnpm preview
```

### 代码检查

```bash
# 运行 lint
pnpm lint

# 格式化代码
pnpm format
```

## 技术栈

### 核心框架

| 技术                                          | 版本 | 说明       |
| --------------------------------------------- | ---- | ---------- |
| [React](https://react.dev/)                   | 19   | 用户界面库 |
| [TypeScript](https://www.typescriptlang.org/) | 6.0  | 类型安全   |
| [Vite](https://vitejs.dev/)                   | 8    | 构建工具   |
| [React Router](https://reactrouter.com/)      | 6    | 客户端路由 |

### UI 组件

| 技术                                            | 说明            |
| ----------------------------------------------- | --------------- |
| [Tailwind CSS](https://tailwindcss.com/)        | 原子化 CSS 框架 |
| [shadcn/ui](https://ui.shadcn.com/)             | 可复用组件库    |
| [Radix UI](https://www.radix-ui.com/)           | 无样式基础组件  |
| [Lucide React](https://lucide.dev/)             | 图标库          |
| [Framer Motion](https://www.framer.com/motion/) | 动画库          |

### 数据与状态

| 技术                                     | 说明           |
| ---------------------------------------- | -------------- |
| [Dexie.js](https://dexie.org/)           | IndexedDB 封装 |
| [Zustand](https://zustand-demo.pmnd.rs/) | 轻量级状态管理 |

### 功能增强

| 技术                                                         | 说明          |
| ------------------------------------------------------------ | ------------- |
| [Recharts](https://recharts.org/)                            | 图表组件      |
| [CodeMirror](https://codemirror.net/)                        | 代码编辑器    |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown 渲染 |
| [KaTeX](https://katex.org/)                                  | 数学公式渲染  |
| [Sonner](https://sonner.emilkowal.dev/)                      | Toast 通知    |

### 开发工具

| 技术                                                 | 说明       |
| ---------------------------------------------------- | ---------- |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter)     | 代码检查   |
| [Prettier](https://prettier.io/)                     | 代码格式化 |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA 支持   |

## 项目结构

```
oi-recorder/
├── public/                    # 静态资源
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-*.png
├── src/
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── Sidebar.tsx       # 侧边栏导航
│   │   ├── CodeEditor.tsx    # 代码编辑器
│   │   ├── MarkdownEditor.tsx # Markdown 编辑器
│   │   └── ...
│   ├── pages/                # 页面组件
│   │   ├── Dashboard.tsx     # 仪表盘
│   │   ├── RecordList.tsx    # 记录列表
│   │   ├── RecordForm.tsx    # 记录表单
│   │   ├── ProblemDetail.tsx # 题目详情
│   │   ├── Tags.tsx          # 标签管理
│   │   ├── Backup.tsx        # 备份恢复
│   │   └── Settings.tsx      # 设置
│   ├── lib/                  # 核心库
│   │   ├── db.ts            # 数据库操作
│   │   ├── types.ts         # TypeScript 类型
│   │   ├── constants.ts     # 常量定义
│   │   ├── selectors.ts     # 跨表 join 与派生数据
│   │   └── utils.ts         # 工具函数
│   ├── store/                # 状态管理
│   │   └── useStore.ts      # Zustand store
│   ├── App.tsx               # 根组件
│   ├── main.tsx              # 入口文件
│   └── index.css             # 全局样式
├── index.html                # HTML 模板
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
├── .oxlintrc.json            # Oxlint 配置
├── .prettierrc               # Prettier 配置
├── .editorconfig             # 编辑器配置
└── LICENSE                   # GPL 3.0 许可证
```

## 使用说明

### 创建做题记录

1. 点击侧边栏的「新建记录」
2. 填写题目信息（标题、难度、洛谷 ID 等）
3. 选择编程语言和状态
4. 编写代码和解题笔记
5. 保存记录

### 管理标签

1. 进入「标签管理」页面
2. 创建算法标签（如：动态规划、图论、数据结构等）
3. 在题目详情中为题目添加标签

### 数据备份

1. 进入「备份恢复」页面
2. 点击「导出数据」下载 JSON 备份文件
3. 需要恢复时，选择备份文件并点击「导入数据」

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 许可证。

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 Star！**

</div>
