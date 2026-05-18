import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { IotProvider } from './state/IotProvider.jsx'
import { AppShell } from './components/layout/AppShell.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { MonitoringPage } from './pages/MonitoringPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { PredictionPage } from './pages/PredictionPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <IotProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </IotProvider>
  )
}
