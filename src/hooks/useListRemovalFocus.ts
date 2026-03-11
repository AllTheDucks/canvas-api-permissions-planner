import { useCallback, useEffect, useRef } from 'react'

export function useListRemovalFocus<T>(items: T[], idFn: (item: T) => string) {
  const refs = useRef<Map<string, HTMLElement>>(new Map())
  const focusTargetRef = useRef<string | null>(null)

  const setRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      refs.current.set(id, el)
    } else {
      refs.current.delete(id)
    }
  }, [])

  useEffect(() => {
    if (focusTargetRef.current) {
      refs.current.get(focusTargetRef.current)?.focus()
      focusTargetRef.current = null
    }
  }, [items])

  const scheduleRemovalFocus = useCallback((removedIndex: number) => {
    const remaining = items.length - 1
    if (remaining === 0) return

    const ids = items
      .filter((_, i) => i !== removedIndex)
      .map(idFn)

    focusTargetRef.current = removedIndex < ids.length
      ? ids[removedIndex]
      : ids[ids.length - 1]
  }, [items, idFn])

  return { setRef, scheduleRemovalFocus }
}
