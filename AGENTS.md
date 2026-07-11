# OI Recorder — Agent Build/Run Commands

## Dev

```bash
pnpm dev
```

## Build (includes tsc typecheck)

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```

## Tech Stack

- Vite + React 19 + TypeScript
- TailwindCSS v3, lucide-react (icons)
- Dexie.js (IndexedDB), dexie-react-hooks, zustand (with persist)
- @uiw/react-codemirror (code editor)
- react-markdown + remark-gfm + remark-math + rehype-katex (MD + math)
- recharts (charts)
- react-router-dom v6
- vite-plugin-pwa
- sonner (toasts)
- Radix UI primitives (dialog, dropdown-menu, select, etc.)

## Project Structure

```
src/
  lib/        types.ts, constants.ts, db.ts, utils.ts
  store/      useStore.ts (zustand UI state with persist: theme, sidebar, settings)
  components/ Sidebar, CodeEditor, MarkdownEditor, ConfirmDialog, ...
  pages/      Dashboard, RecordList, RecordForm, ProblemDetail, Tags, Backup, Settings
```
