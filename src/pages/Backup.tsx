import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { exportAll, getDataCounts, importAll, parseBackupFile } from '@/lib/db'
import type { BackupData } from '@/lib/db'
import { getErrorMessage } from '@/lib/utils'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Backup() {
  const [pending, setPending] = useState<BackupData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(() => getDataCounts(), [])

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
    } catch (err) {
      toast.error(`导出失败：${getErrorMessage(err)}`)
    }
  }

  // 选中文件后先解析校验，通过后再弹确认框，确认了才真正覆盖数据库
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 立即清空，否则连续选择同一个文件不会再触发 change
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    try {
      setPending(parseBackupFile(await file.text()))
    } catch (err) {
      toast.error(`导入失败：${getErrorMessage(err)}`)
    }
  }

  const handleConfirmImport = async () => {
    if (!pending) return
    try {
      await importAll(pending)
      toast.success(
        `导入成功：${pending.problems.length} 题，${pending.attempts.length} 条记录，${pending.tags.length} 个标签`
      )
      setPending(null)
    } catch (err) {
      toast.error(`导入失败：${getErrorMessage(err)}`)
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
            {counts
              ? `当前共有 ${counts.problems} 道题、${counts.attempts} 条记录、${counts.tags} 个标签。导入会将其全部清除并替换，建议先导出备份。`
              : '导入会清除并替换当前全部数据，建议先导出备份。'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            选择文件导入
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title="确认覆盖导入"
        description={
          pending
            ? `将用备份中的 ${pending.problems.length} 道题、${pending.attempts.length} 条记录、${pending.tags.length} 个标签覆盖当前全部数据${
                counts
                  ? `（现有 ${counts.problems} 道题、${counts.attempts} 条记录、${counts.tags} 个标签）`
                  : ''
              }，此操作不可撤销。`
            : ''
        }
        confirmText="覆盖导入"
        destructive
        onConfirm={handleConfirmImport}
      />
    </div>
  )
}

export default Backup
