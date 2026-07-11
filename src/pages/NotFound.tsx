import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

function NotFound() {
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

export default NotFound
