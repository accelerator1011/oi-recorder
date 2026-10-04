const assert = require('node:assert/strict')
const { test } = require('node:test')
const { JSDOM } = require('jsdom')
const { loadSource } = require('./helpers.cjs')

test('编辑页加载失败时没有可提交表单，重试成功后才展示原记录', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/records/7/edit' })
  global.window = dom.window
  global.document = dom.window.document
  global.IS_REACT_ACT_ENVIRONMENT = true
  const React = require('react')
  const { createRoot } = require('react-dom/client')
  const { act } = React
  const navigate = () => {}
  let queries = 0
  let saves = 0
  const mocks = {
    'react-router-dom': {
      useParams: () => ({ id: '7' }),
      useNavigate: () => navigate,
      useBlocker: () => ({ state: 'unblocked' }),
      useBeforeUnload: () => {},
    },
    sonner: { toast: { error() {}, success() {} } },
    '@/lib/db': {
      isValidDateString: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
      getAttempt: async () => {
        if (++queries === 1) throw new Error('模拟读取失败')
        return { problemId: 1, date: '2026-10-04', status: 'WA', language: 'C++', timeSpentMin: 30 }
      },
      getProblem: async () => ({ id: 1, title: '原题名', difficulty: 3 }),
      getTagsForProblem: async () => [],
      getAttemptDraft: async () => ({ code: '原代码', notes: '原笔记' }),
      saveRecord: async () => {
        saves += 1
      },
    },
    '@/lib/constants': loadSource('src/lib/constants.ts'),
    '@/lib/utils': {
      cn: (...values) => values.filter(Boolean).join(' '),
      getErrorMessage: (error) => error.message,
      toLocalDateString: () => '2026-10-04',
    },
    '@/store/useStore': {
      useStore: (selector) => selector({ defaultLanguage: 'C++', darkMode: false }),
    },
  }
  const empty = () => null
  for (const name of ['CodeEditor', 'MarkdownEditor', 'TagSelector', 'ConfirmDialog']) {
    mocks[`@/components/${name}`] = empty
  }
  mocks['@/components/PageHeader'] = ({ actions }) => actions
  for (const [name, tag, exported] of [
    ['button', 'button', 'Button'],
    ['input', 'input', 'Input'],
    ['label', 'label', 'Label'],
    ['card', 'div', 'Card'],
  ]) {
    mocks[`@/components/ui/${name}`] = {
      [exported]: ({ children, size: _size, ...props }) =>
        React.createElement(tag, props, children),
    }
  }
  mocks['@/components/ui/select'] = Object.fromEntries(
    ['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map((name) => [
      name,
      empty,
    ])
  )
  const RecordForm = loadSource('src/pages/RecordForm.tsx', mocks).default
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    delete global.window
    delete global.document
    delete global.IS_REACT_ACT_ENVIRONMENT
  })
  await act(async () => root.render(React.createElement(RecordForm)))
  assert.match(document.querySelector('[role="alert"]').textContent, /模拟读取失败/)
  assert.equal(document.querySelector('form'), null)
  assert.equal(saves, 0)
  await act(async () => document.querySelector('button').click())
  assert.equal(queries, 2)
  assert.equal(document.querySelector('[role="alert"]'), null)
  assert.ok(document.querySelector('form'))
  assert.equal(document.querySelector('#title').value, '原题名')
  assert.equal(document.querySelector('#time').value, '30')
})
