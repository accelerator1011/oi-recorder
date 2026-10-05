import { useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import MarkdownView from '@/components/MarkdownView'

interface Props {
  value: string
  onChange: (value: string) => void
}

function MarkdownEditor({ value, onChange }: Props) {
  const [preview, setPreview] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div
        className="flex items-center border-b bg-muted/30"
        role="group"
        aria-label="笔记视图切换"
      >
        <button
          type="button"
          onClick={() => setPreview(false)}
          aria-pressed={!preview}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-sm transition-colors',
            !preview
              ? 'border-b-2 border-foreground bg-background text-foreground'
              : 'border-b-2 border-transparent text-muted-foreground'
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          aria-pressed={preview}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-sm transition-colors',
            preview
              ? 'border-b-2 border-foreground bg-background text-foreground'
              : 'border-b-2 border-transparent text-muted-foreground'
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          预览
        </button>
      </div>
      <div className="min-h-[200px]">
        {preview ? (
          <MarkdownView content={value || '(无内容)'} className="p-4" />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Markdown 笔记..."
            aria-label="Markdown 笔记"
            className="min-h-[200px] w-full resize-y bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor
