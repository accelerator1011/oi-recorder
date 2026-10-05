/** 数据未就绪时的占位。首页、列表、表单、详情、标签页各有一份，样式必须一致 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  )
}

export default LoadingState
