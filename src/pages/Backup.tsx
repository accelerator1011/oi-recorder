import { useState, useRef } from 'react'
import { Download, Upload, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { exportAll, importAll } from '@/lib/db'
import type { BackupData } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

function Backup() {
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `oi-recorder-backup-${data.exportedAt.slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('备份导出成功')
    } catch {
      toast.error('导出失败')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text) as BackupData

      if (
        !data.version ||
        !Array.isArray(data.problems) ||
        !Array.isArray(data.tags) ||
        !Array.isArray(data.problemTags) ||
        !Array.isArray(data.attempts)
      ) {
        throw new Error('无效的备份文件格式')
      }

      for (const p of data.problems) {
        if (
          typeof p !== 'object' ||
          p === null ||
          typeof p.title !== 'string' ||
          typeof p.difficulty !== 'number'
        ) {
          throw new Error('备份数据中包含无效的题目记录')
        }
      }
      for (const t of data.tags) {
        if (typeof t !== 'object' || t === null || typeof t.name !== 'string') {
          throw new Error('备份数据中包含无效的标签记录')
        }
      }
      for (const pt of data.problemTags) {
        if (
          typeof pt !== 'object' ||
          pt === null ||
          typeof pt.problemId !== 'number' ||
          typeof pt.tagId !== 'number'
        ) {
          throw new Error('备份数据中包含无效的题目-标签关联记录')
        }
      }
      for (const a of data.attempts) {
        if (
          typeof a !== 'object' ||
          a === null ||
          typeof a.problemId !== 'number' ||
          typeof a.date !== 'string' ||
          typeof a.status !== 'string'
        ) {
          throw new Error('备份数据中包含无效的做题记录')
        }
      }

      await importAll(data)
      toast.success(
        `导入成功：${data.problems.length} 题，${data.attempts.length} 条记录，${data.tags.length} 个标签`
      )
    } catch (err) {
      toast.error(`导入失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">备份恢复</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导出备份</CardTitle>
          <CardDescription>将所有数据（题目、记录、标签）导出为 JSON 文件。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            导出 JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导入备份</CardTitle>
          <CardDescription>
            选择之前导出的 JSON 备份文件。导入将<strong>覆盖</strong>当前所有数据，请谨慎操作。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            导入将清除并替换当前全部数据，建议先导出备份。
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {importing ? '导入中...' : '选择文件导入'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Backup
