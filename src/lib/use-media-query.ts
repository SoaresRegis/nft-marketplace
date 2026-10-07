import { useEffect, useRef, useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const MOBILE_QUERY = '(max-width: 767.98px)'

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}

export function useBottomBarOffset<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--bottom-bar', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--bottom-bar')
    }
  }, [active])
  return ref
}
