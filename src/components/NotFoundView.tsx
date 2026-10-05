import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

interface Props {
  title?: string
  description?: string
}

/**
 * 找不到内容的占位视图。路由的 * 分支与「题目已被删除」的详情页共用同一份，
 * 所以它住在 components/ 而不是 pages/ —— 页面之间不横向依赖。
 *
 * 默认文案针对「链接不存在」。题目被删时用户其实在一个合法 URL 上，
 * 提示不该把人引去检查链接，所以由调用方覆盖文案。
 */
function NotFoundView({
  title = '404 - 页面不存在',
  description = '你访问的页面不存在，请检查链接是否正确。',
}: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<FileQuestion className="h-16 w-16" />}
        title={title}
        description={description}
        action={
          <Link to="/">
            <Button size="sm">返回首页</Button>
          </Link>
        }
      />
    </div>
  )
}

export default NotFoundView
