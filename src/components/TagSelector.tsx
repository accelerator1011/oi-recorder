import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { createTag, getAllTags } from '@/lib/db'
import type { Tag } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

function TagSelector({ selectedIds, onChange }: Props) {
  const allTagsRaw = useLiveQuery(() => getAllTags(), [])
  const allTags = useMemo(() => allTagsRaw ?? [], [allTagsRaw])
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedTags = useMemo(
    () => allTags.filter((t) => t.id !== undefined && selectedIds.includes(t.id)),
    [allTags, selectedIds]
  )

  const availableTags = useMemo(
    () =>
      allTags.filter(
        (t) =>
          t.id !== undefined &&
          !selectedIds.includes(t.id) &&
          t.name.toLowerCase().includes(input.toLowerCase())
      ),
    [allTags, selectedIds, input]
  )

  // 下拉是否真的可见，aria-expanded 要反映这个而不是 showDropdown
  const dropdownVisible = showDropdown && Boolean(input || availableTags.length > 0)

  const handleToggle = useCallback(
    (tag: Tag) => {
      const tagId = tag.id
      if (tagId === undefined) return
      if (selectedIds.includes(tagId)) {
        onChange(selectedIds.filter((id) => id !== tagId))
      } else {
        onChange([...selectedIds, tagId])
      }
    },
    [selectedIds, onChange]
  )

  const handleCreateAndAdd = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      const id = await createTag(trimmed)
      if (!selectedIds.includes(id)) {
        onChange([...selectedIds, id])
      }
      setInput('')
      setShowDropdown(false)
    } catch {
      toast.error('创建标签失败')
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2'
        )}
      >
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="cursor-pointer gap-1">
            {tag.name}
            <button
              type="button"
              onClick={() => handleToggle(tag)}
              className="hover:text-foreground"
              aria-label={`移除标签 ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedTags.length === 0 ? '输入算法标签...' : ''}
          role="combobox"
          aria-expanded={dropdownVisible}
          aria-autocomplete="list"
          aria-label="算法标签"
          className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (availableTags.length > 0 && input) {
                handleToggle(availableTags[0])
                setInput('')
              } else if (input) {
                handleCreateAndAdd()
              }
            }
          }}
        />
      </div>

      {dropdownVisible && (
        <div
          role="listbox"
          aria-label="标签候选"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                handleToggle(tag)
                setInput('')
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
            >
              {tag.name}
            </button>
          ))}
          {input && !allTags.find((t) => t.name.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={handleCreateAndAdd}
              className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              创建 &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TagSelector
