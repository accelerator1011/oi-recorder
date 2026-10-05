import { lazy, Suspense, useLayoutEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '@/components/PageTransition'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from '@/components/Sidebar'
// 404 视图是极轻的静态组件，且 ProblemDetail 静态引用着它，lazy 拆不出包，
// 只会让 404 路由先闪一下「加载中」。页面才值得懒加载。
import NotFoundView from '@/components/NotFoundView'
import LoadingState from '@/components/LoadingState'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RecordList = lazy(() => import('@/pages/RecordList'))
const RecordForm = lazy(() => import('@/pages/RecordForm'))
const ProblemDetail = lazy(() => import('@/pages/ProblemDetail'))
const Tags = lazy(() => import('@/pages/Tags'))
const Backup = lazy(() => import('@/pages/Backup'))
const Settings = lazy(() => import('@/pages/Settings'))

function App() {
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const darkMode = useStore((s) => s.darkMode)
  const location = useLocation()

  // 应用主题的唯一入口：store 的 rehydrate 是同步的，首帧就能拿到正确的 darkMode，
  // 而 useLayoutEffect 在 paint 前执行，所以这里也覆盖了刷新时的首次渲染。
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', darkMode ? '#0f172a' : '#ffffff')
    }
  }, [darkMode])

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main
          className={cn(
            'flex-1 overflow-auto bg-background transition-all duration-200',
            'ml-16',
            sidebarOpen ? 'sm:ml-56' : 'sm:ml-16'
          )}
        >
          <div className="p-4 sm:p-8">
            <ErrorBoundary>
              {/*
                AnimatePresence 的直接子元素必须是 PageTransition 这个 motion 组件，
                并且它不能自己 suspend：mode="wait" 要等退场动画结束才渲染新页面，
                若把 key 挂在 <Routes> 上、而懒加载的 Suspense 又包在 AnimatePresence 外面，
                页面组件挂起时退场永远等不到完成，整个应用会卡在「加载中」。
                所以顺序是：外层 AnimatePresence → PageTransition（带 key）→ Suspense → Routes。
                initial={false} 让首次进入不播放进场动画，避免刷新时白闪一下。
              */}
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition key={location.pathname}>
                  <Suspense fallback={<LoadingState />}>
                    <Routes location={location}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/records" element={<RecordList />} />
                      <Route path="/records/new" element={<RecordForm />} />
                      <Route path="/records/:id/edit" element={<RecordForm />} />
                      <Route path="/problems/:id" element={<ProblemDetail />} />
                      <Route path="/tags" element={<Tags />} />
                      <Route path="/backup" element={<Backup />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFoundView />} />
                    </Routes>
                  </Suspense>
                </PageTransition>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors theme={darkMode ? 'dark' : 'light'} />
    </TooltipProvider>
  )
}

export default App
