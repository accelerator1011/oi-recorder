import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useStore } from '@/store/useStore'
import type { Language } from '@/lib/types'

interface Props {
  value: string
  onChange: (value: string) => void
  language?: Language
  readOnly?: boolean
}

const LANG_EXTENSIONS: Partial<Record<Language, () => Extension>> = {
  'C++': () => cpp(),
  C: () => cpp(),
  Python: () => python(),
}

const CODE_FONT_FAMILY =
  "'JetBrains Mono', 'JBMono', 'Fira Code', 'Cascadia Code', Consolas, monospace"

function CodeEditor({ value, onChange, language, readOnly = false }: Props) {
  const darkMode = useStore((s) => s.darkMode)
  const fontSize = useStore((s) => s.codeFontSize)

  const extensions: Extension[] = useMemo(
    () => [
      EditorView.theme({
        '.cm-scroller, .cm-content, .cm-line, .cm-gutters': {
          fontFamily: CODE_FONT_FAMILY,
        },
      }),
      // CodeMirror 的可编辑区是 contenteditable，自身没有可读名称，
      // 不加的话读屏只会念出一段没有上下文的编辑区。
      EditorView.contentAttributes.of({
        'aria-label': readOnly ? '代码（只读）' : '代码编辑器',
        ...(readOnly ? { 'aria-readonly': 'true' } : {}),
      }),
      ...(language
        ? [LANG_EXTENSIONS[language]?.()].filter((ext): ext is Extension => ext !== undefined)
        : []),
    ],
    [language, readOnly]
  )

  const style = useMemo(() => ({ fontSize: `${fontSize}px` }), [fontSize])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      editable={!readOnly}
      readOnly={readOnly}
      theme={darkMode ? 'dark' : 'light'}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        autocompletion: true,
        indentOnInput: true,
      }}
      style={style}
      extensions={extensions}
    />
  )
}

export default CodeEditor
