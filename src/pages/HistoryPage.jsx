import { HistoryTable } from '../components/history/HistoryTable.jsx'
import { useIot } from '../state/iotContext.js'

export function HistoryPage() {
  const { state } = useIot()
  return <HistoryTable history={state.history} />
}
