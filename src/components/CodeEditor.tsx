import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'
import { useStore } from '@/store/useStore'
import type { Language } from '@/lib/types'

interface Props {
  value: string
  onChange: (value: string) => void
  language?: Language
}

const LANG_EXTENSIONS: Partial<Record<Language, () => Extension>> = {
  'C++': () => cpp(),
  C: () => cpp(),
  Python: () => python(),
}

function CodeEditor({ value, onChange, language }: Props) {
  const darkMode = useStore((s) => s.darkMode)
  const fontSize = useStore((s) => s.codeFontSize)

  const extensions: Extension[] = useMemo(
    () =>
      language
        ? [LANG_EXTENSIONS[language]?.()].filter((ext): ext is Extension => ext !== undefined)
        : [],
    [language]
  )

  const style = useMemo(() => ({ fontSize: `${fontSize}px` }), [fontSize])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
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
