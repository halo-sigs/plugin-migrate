import { onUnmounted } from 'vue'

export function useBeforeUnloadGuard(message = '数据正在导入中，请勿关闭或刷新此页面。') {
  let enabled = false

  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault()
    event.returnValue = ''
    return message
  }

  function enable() {
    if (enabled) {
      return
    }

    window.addEventListener('beforeunload', handler)
    enabled = true
  }

  function disable() {
    if (!enabled) {
      return
    }

    window.removeEventListener('beforeunload', handler)
    enabled = false
  }

  onUnmounted(() => {
    disable()
  })

  return {
    enable,
    disable
  }
}
