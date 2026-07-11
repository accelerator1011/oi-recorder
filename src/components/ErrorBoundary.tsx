import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <h2 className="text-lg font-semibold">页面出错了</h2>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              重试
            </Button>
            <Button size="sm" onClick={() => (window.location.href = '/')}>
              返回首页
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
