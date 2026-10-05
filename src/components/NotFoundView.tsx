import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

/**
 * 404 视图。路由的 * 分支与「题目已被删除」的详情页共用同一份，
 * 所以它住在 components/ 而不是 pages/ —— 页面之间不横向依赖。
 */
function NotFoundView() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<FileQuestion className="h-16 w-16" />}
        title="404 - 页面不存在"
        description="你访问的页面不存在，请检查链接是否正确。"
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
