const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8')

/**
 * App 外壳的嵌套顺序是一条硬约束，不能靠注释提醒：
 *
 * AnimatePresence 的直接子元素必须是带 key 的 PageTransition（motion 组件），
 * 而懒加载的 Suspense 必须排在它里面。反过来的写法会让 mode="wait"
 * 等一个永远不会完成的退场动画，整个应用卡死在「加载中」——
 * 不产生任何 console 报错，pnpm test / lint / build 也照样全绿。
 *
 * 整份渲染测试代价太大（页面是懒加载的，还牵进 Recharts 的 ResizeObserver），
 * 所以这里只断言决定生死的四个标签的相对顺序。
 */
test('App 外壳的 AnimatePresence / PageTransition / Suspense / Routes 顺序不可调换', () => {
  // 必须连着各自的属性一起匹配：App.tsx 里解释这段顺序的注释本身也提到了
  // <Routes>，只搜标签名会先命中注释里的那一次
  const animate = appSource.indexOf('<AnimatePresence mode=')
  const transition = appSource.indexOf('<PageTransition key=')
  const suspense = appSource.indexOf('<Suspense fallback=')
  const routes = appSource.indexOf('<Routes location=')

  for (const [name, index] of [
    ['AnimatePresence', animate],
    ['PageTransition', transition],
    ['Suspense', suspense],
    ['Routes', routes],
  ]) {
    assert.notEqual(index, -1, `App.tsx 里应当还能找到 ${name}`)
  }

  assert.ok(animate < transition, 'AnimatePresence 必须在 PageTransition 外层')
  assert.ok(transition < suspense, 'PageTransition 必须在 Suspense 外层（它不能自己挂起）')
  assert.ok(suspense < routes, 'Suspense 必须在 Routes 外层')
})

test('key 挂在 PageTransition 上，而不是 Routes 上', () => {
  assert.match(appSource, /<PageTransition key=\{location\.pathname\}>/)
  assert.doesNotMatch(
    appSource,
    /<Routes[^>]*key=/,
    'key 必须留在 motion 子元素上；挂到 <Routes> 会让退场动画失去跟踪对象'
  )
})
