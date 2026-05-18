import { useEffect, useRef } from 'react'

export function useInterval(callback, delayMs) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs == null) return
    const id = window.setInterval(() => callbackRef.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs])
}

