import { useStore } from '@/store/useStore'
import { LANGUAGE_OPTIONS } from '@/lib/constants'
import type { Language } from '@/lib/types'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'

function Settings() {
  const darkMode = useStore((s) => s.darkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const defaultLanguage = useStore((s) => s.defaultLanguage)
  const setDefaultLanguage = useStore((s) => s.setDefaultLanguage)
  const codeFontSize = useStore((s) => s.codeFontSize)
  const setCodeFontSize = useStore((s) => s.setCodeFontSize)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">设置</h1>

      <Card>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">深色模式</p>
              <p className="mt-0.5 text-xs text-muted-foreground">切换应用外观主题</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">默认语言</p>
              <p className="mt-0.5 text-xs text-muted-foreground">新建记录时的默认编程语言</p>
            </div>
            <Select
              value={defaultLanguage}
              onValueChange={(v) => setDefaultLanguage(v as Language)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">代码字号</p>
              <p className="mt-0.5 text-xs text-muted-foreground">代码编辑器的字体大小 (px)</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={24}
                value={codeFontSize}
                onChange={(e) => setCodeFontSize(Number(e.target.value))}
                className="w-28 accent-primary"
              />
              <span className="w-10 text-right text-sm tabular-nums">{codeFontSize}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-sm font-medium">关于</p>
        <p className="text-xs text-muted-foreground">OI Recorder — 信息竞赛做题记录工具 v1.0.0</p>
        <p className="text-xs text-muted-foreground">数据存储在浏览器 IndexedDB 中，请定期备份。</p>
      </Card>
    </div>
  )
}

export default Settings
