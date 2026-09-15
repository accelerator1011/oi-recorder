import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  TagsIcon,
  Download,
  Settings,
  ChevronLeft,
  Code2,
  Sun,
  Moon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '首页', exact: true },
  { to: '/records', icon: ListTodo, label: '全部记录', exact: true, matchSubRecords: true },
  { to: '/records/new', icon: PlusCircle, label: '新建记录' },
  { to: '/tags', icon: TagsIcon, label: '标签管理' },
  { to: '/backup', icon: Download, label: '备份恢复' },
  { to: '/settings', icon: Settings, label: '设置' },
]

function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const darkMode = useStore((s) => s.darkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const location = useLocation()

  const isActive = (to: string, exact?: boolean, matchSubRecords?: boolean) => {
    if (matchSubRecords && to === '/records') {
      return (
        location.pathname === '/records' ||
        (location.pathname.startsWith('/records/') && !location.pathname.startsWith('/records/new'))
      )
    }
    if (exact) return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <aside
      aria-label="主导航"
      className={cn(
        'fixed left-0 top-0 h-full border-r border-border bg-background',
        'z-30 flex flex-col overflow-hidden transition-all duration-200',
        'w-16',
        sidebarOpen ? 'sm:w-56' : 'sm:w-16'
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-border px-[20px]">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Link to="/" className="flex items-center" aria-label="OI Recorder 首页">
              <Code2 className="h-6 w-6 shrink-0" />
              <span
                className={cn(
                  'hidden overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight transition-all duration-200 sm:inline',
                  sidebarOpen ? 'ml-3 max-w-60 opacity-100' : 'ml-0 max-w-0 opacity-0'
                )}
              >
                OI Recorder
              </span>
            </Link>
          </TooltipTrigger>
          {!sidebarOpen && <TooltipContent side="right">OI Recorder</TooltipContent>}
        </Tooltip>
      </div>

      <nav aria-label="页面导航" className="flex flex-1 flex-col py-2">
        {navItems.map(({ to, icon: Icon, label, exact, matchSubRecords }) => {
          const active = isActive(to, exact, matchSubRecords)

          return (
            <Tooltip key={to} delayDuration={150}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-12 w-full items-center px-[22px] text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span
                    className={cn(
                      'hidden overflow-hidden whitespace-nowrap transition-all duration-200 sm:inline',
                      sidebarOpen ? 'ml-3 max-w-60 opacity-100' : 'ml-0 max-w-0 opacity-0'
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </TooltipTrigger>
              {!sidebarOpen && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border p-2">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              aria-label="切换主题"
              className="w-full justify-start px-[14px] text-muted-foreground hover:text-foreground"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? 'sun' : 'moon'}
                  initial={{ rotate: -120, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 120, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex shrink-0"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
              <span
                className={cn(
                  'hidden overflow-hidden whitespace-nowrap transition-all duration-200 sm:inline',
                  sidebarOpen ? 'ml-3 max-w-60 opacity-100' : 'ml-0 max-w-0 opacity-0'
                )}
              >
                切换主题
              </span>
            </Button>
          </TooltipTrigger>
          {!sidebarOpen && (
            <TooltipContent side="right">{darkMode ? '切换亮色' : '切换暗色'}</TooltipContent>
          )}
        </Tooltip>

        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              aria-label="切换侧边栏"
              aria-expanded={sidebarOpen}
              className="hidden w-full justify-start px-[14px] text-muted-foreground hover:text-foreground sm:flex"
            >
              <motion.span
                initial={false}
                animate={{ rotate: sidebarOpen ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                className="inline-flex shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.span>
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-all duration-200',
                  sidebarOpen ? 'ml-3 max-w-60 opacity-100' : 'ml-0 max-w-0 opacity-0'
                )}
              >
                收起菜单
              </span>
            </Button>
          </TooltipTrigger>
          {!sidebarOpen && <TooltipContent side="right">展开</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  )
}

export default Sidebar
