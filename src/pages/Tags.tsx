import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { createTag, updateTag, deleteTag, getTagUsageCounts, getAllTags } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import LoadingState from '@/components/LoadingState'
import { getErrorMessage } from '@/lib/utils'

interface DeleteTarget {
  id: number
  name: string
}

function Tags() {
  const allTags = useLiveQuery(() => getAllTags(), [])
  const usageCounts = useLiveQuery(() => getTagUsageCounts(), [])

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await createTag(newName.trim())
      setNewName('')
      setAdding(false)
    } catch (err) {
      toast.error(`创建标签失败：${getErrorMessage(err)}`)
    }
  }

  // 失败时保留编辑态，用户不用重新点开才能改
  const handleRename = async (id: number) => {
    if (!editName.trim()) return
    try {
      await updateTag(id, editName.trim())
      setEditingId(null)
    } catch (err) {
      toast.error(`重命名失败：${getErrorMessage(err)}`)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteTag(id)
    } catch (err) {
      toast.error(`删除标签失败：${getErrorMessage(err)}`)
    }
  }

  // 确认框打开期间现读用量：对话框开着的时候别的标签页可能已经改过关联，
  // 把 count 快照进 state 只会显示一个过期的数字
  const deleteUsage = deleteTarget ? usageCounts?.get(deleteTarget.id) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="标签管理"
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            新建标签
          </Button>
        }
      />

      {adding && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="标签名，如 DP、图论..."
              aria-label="新标签名"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') {
                  setAdding(false)
                  setNewName('')
                }
              }}
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={handleAdd} aria-label="确认添加">
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAdding(false)
                setNewName('')
              }}
              aria-label="取消添加"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {allTags === undefined ? (
        <LoadingState />
      ) : allTags.length === 0 ? (
        <EmptyState
          title="暂无标签"
          description='点击"新建标签"创建算法标签'
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              新建标签
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {allTags.map((tag) => {
              const tagId = tag.id
              const count = usageCounts?.get(tagId)
              const isEditing = editingId === tagId
              return (
                <div key={tag.id} className="flex items-center gap-3 px-4 py-3">
                  {isEditing ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        aria-label={`重命名标签 ${tag.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(tagId)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRename(tagId)}
                        aria-label="确认重命名"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(null)}
                        aria-label="取消重命名"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{tag.name}</span>
                      {/* 用量与标签列表是两个独立查询，没回来之前宁可不显示，
                          也别先摆一个假的「0 题」 */}
                      {count !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {count} 题
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingId(tagId)
                          setEditName(tag.name)
                        }}
                        aria-label={`编辑标签 ${tag.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setDeleteTarget({
                            id: tagId,
                            name: tag.name,
                          })
                        }
                        aria-label={`删除标签 ${tag.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="删除标签"
        description={
          deleteTarget && deleteUsage
            ? `标签 "${deleteTarget.name}" 被 ${deleteUsage} 道题使用，确定删除？`
            : `确定删除标签 "${deleteTarget?.name ?? ''}"？`
        }
        confirmText="删除"
        destructive
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget.id)
        }}
      />
    </div>
  )
}

export default Tags
