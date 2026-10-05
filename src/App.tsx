import { lazy, Suspense, useLayoutEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '@/components/PageTransition'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from '@/components/Sidebar'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RecordList = lazy(() => import('@/pages/RecordList'))
const RecordForm = lazy(() => import('@/pages/RecordForm'))
const ProblemDetail = lazy(() => import('@/pages/ProblemDetail'))
const Tags = lazy(() => import('@/pages/Tags'))
const Backup = lazy(() => import('@/pages/Backup'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  )
}

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
              <Suspense fallback={<PageFallback />}>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route
                      path="/"
                      element={
                        <PageTransition>
                          <Dashboard />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/records"
                      element={
                        <PageTransition>
                          <RecordList />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/records/new"
                      element={
                        <PageTransition>
                          <RecordForm />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/records/:id/edit"
                      element={
                        <PageTransition>
                          <RecordForm />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/problems/:id"
                      element={
                        <PageTransition>
                          <ProblemDetail />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/tags"
                      element={
                        <PageTransition>
                          <Tags />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/backup"
                      element={
                        <PageTransition>
                          <Backup />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <PageTransition>
                          <Settings />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <PageTransition>
                          <NotFound />
                        </PageTransition>
                      }
                    />
                  </Routes>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors theme={darkMode ? 'dark' : 'light'} />
    </TooltipProvider>
  )
}

export default App
