# OI Recorder — Repository Guide

## Environment and commands

Use pnpm with the committed `pnpm-lock.yaml`. The lockfile requires pnpm 9 or newer.
Node.js must satisfy `^22.22.2 || ^24.15.0 || >=26.0.0` (the jsdom test dependency sets this minimum).
Node.js 24 LTS, version 24.15.0 or newer, is recommended.

| Command                             | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | Install the locked dependencies                                           |
| `pnpm dev`                          | Start the Vite development server                                         |
| `pnpm build`                        | Run TypeScript checks and build the PWA into `dist/`                      |
| `pnpm preview`                      | Preview the production build after building                               |
| `pnpm test`                         | Run Node.js regression tests in `tests/*.test.cjs`                        |
| `pnpm type-check`                   | Run TypeScript checks without emitting output                             |
| `pnpm lint` / `pnpm lint:fix`       | Check with Oxlint / apply its automatic fixes                             |
| `pnpm format:check` / `pnpm format` | Check / format source, tests and root TypeScript, JSON and Markdown files |

After code changes, run `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm build`.
For documentation-only changes, run `pnpm format:check` and verify documented commands and UI labels against the code.
Keep Lint free of errors and warnings; resolve findings rather than disabling project-wide rules.

## Tech stack

- Vite 8, React 19, TypeScript 6; React Router v6 data router
- Tailwind CSS v3, Radix UI primitives, lucide-react, Framer Motion, sonner
- Dexie.js and dexie-react-hooks for IndexedDB; Zustand with persist for UI settings
- CodeMirror via @uiw/react-codemirror; C/C++ and Python syntax highlighting
- react-markdown, remark-gfm, remark-math and rehype-katex for notes and math
- Recharts; vite-plugin-pwa; Oxlint; Prettier with prettier-plugin-tailwindcss
- Node.js test runner, fake-indexeddb and jsdom for regression tests

## Project structure

```text
src/
  lib/          types.ts, constants.ts, db.ts, selectors.ts, utils.ts
  store/        useStore.ts (theme, sidebar, default language and code font size)
  components/   Sidebar, CodeEditor, MarkdownEditor, ConfirmDialog, ui/ primitives
  pages/        Dashboard, RecordList, RecordForm, ProblemDetail, Tags, Backup, Settings, NotFound
  router.tsx    Data router required by useBlocker
  App.tsx       Layout, lazy page routes, transitions and error boundary
  main.tsx      React entry point
  index.css     Global styles and KaTeX styles
tests/         Database and form regression tests; helpers.cjs loads TypeScript source
public/        Icons and static-host SPA/cache configuration
```

## Data and behavior constraints

- All records live in the browser's `OiRecorderDB` IndexedDB database. UI settings live in localStorage.
- Problems, tags, problemTags and attempts store metadata. attemptContents stores code and notes, keyed by attempt ID. Lists and statistics should query metadata without reading all contents.
- Use `saveRecord` to save a form. Problem fields, tags, attempt metadata and content must commit together. Preserve the write transaction around Luogu ID lookup and upsert for concurrency safety.
- Preserve existing databases through Dexie versioned migrations. Keep historical duplicate Luogu IDs readable and restorable; backup relationships use numeric IDs. Avoid adding a unique Luogu ID index without a migration for existing duplicates.
- Backups use version 1 with code and notes inline in each attempt. Validate files before confirming overwrite; reject missing attempt IDs before clearing any tables. Import all tables in one transaction.
- Dates use local `YYYY-MM-DD` strings. Validate real calendar dates at the form and database write boundaries.
- Editing a record changes its shared problem title, difficulty and tags. Deleting its final attempt also deletes the problem and its tag links; preserve the explicit confirmation.
- Count passed problems once, on their first AC date. A problem with attempts but no AC counts as in progress. Difficulty, algorithm distribution and the seven-day trend count passed problems.
- Keep unsaved-change protection for internal navigation and browser unload. A failed edit load must show an error/retry state and must not expose a submittable default form.
- Component modules should export components and types only. Check persisted optional IDs before using them, and avoid mutating query results when building view data.

## Regression tests

`tests/helpers.cjs` transpiles the actual TypeScript modules for the Node.js runner.
Database tests execute Dexie against isolated fake-indexeddb databases; form tests use React with jsdom and mocked dependencies.
Tests must never read or clear a user's browser database. Cover rollback, concurrent writes, backup preservation and form error states when changing those behaviors.
