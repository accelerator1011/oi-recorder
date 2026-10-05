const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function loadSource(file, mocks = {}) {
  const filename = path.join(__dirname, '..', file)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const module = new Module(filename)
  module.filename = filename
  // Node 的编译 API 用于执行真实源码，避免事务测试落到手写的数据库替身上。
  // 下面的 _ 开头成员是 Node 的内部 API，没有替代方案。
  module.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalRequire = module.require.bind(module)
  module.require = (name) => (Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name))
  module._compile(compiled, filename)
  return module.exports
}

function loadDatabase(t, name = `backup-test-${crypto.randomUUID()}`) {
  require('fake-indexeddb/auto')
  const Dexie = require('dexie').default
  class TestDatabase extends Dexie {
    constructor() {
      super(name)
    }
  }
  const api = loadSource('src/lib/db.ts', {
    dexie: TestDatabase,
    './constants': loadSource('src/lib/constants.ts'),
  })
  t.after(() => api.db.delete())
  return api
}

module.exports = { loadSource, loadDatabase }
