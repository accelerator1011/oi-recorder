import { createBrowserRouter } from 'react-router-dom'
import App from './App'

/**
 * 用 data router 承载整个应用外壳，唯一目的是拿到 `useBlocker`
 * （未保存修改的离开拦截）与 `useBeforeUnload`。
 *
 * 具体的页面路由仍然由 App 内部的 <Routes> 负责，这样 AnimatePresence 的
 * 过渡动画行为与迁移前完全一致；父路由必须写成 `'*'`，否则内部 <Routes>
 * 在深层路径（如 /records/1/edit）下不会被匹配。
 */
export const router = createBrowserRouter([{ path: '*', element: <App /> }])
