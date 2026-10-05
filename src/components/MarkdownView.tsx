import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn } from '@/lib/utils'

/**
 * 只读的 Markdown 渲染。编辑器预览与题目详情里的笔记展示共用这一份，
 * GFM / 公式支持的配置只写一次，将来升级插件不会漏改其中一处。
 */
function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownView
