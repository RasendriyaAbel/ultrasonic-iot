import { createContext, useContext } from 'react'

export const IotContext = createContext(null)

export function useIot() {
  const ctx = useContext(IotContext)
  if (!ctx) throw new Error('useIot must be used within IotProvider')
  return ctx
}

