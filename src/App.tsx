import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '@/components/PageTransition'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import RecordList from '@/pages/RecordList'
import RecordForm from '@/pages/RecordForm'
import ProblemDetail from '@/pages/ProblemDetail'
import Tags from '@/pages/Tags'
import Backup from '@/pages/Backup'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

function App() {
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const darkMode = useStore((s) => s.darkMode)
  const location = useLocation()

  useEffect(() => {
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
            sidebarOpen ? 'ml-56' : 'ml-16'
          )}
        >
          <div className="p-8">
            <ErrorBoundary>
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
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  )
}

export default App
