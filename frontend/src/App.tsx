import { BrowserRouter, Route, Routes } from 'react-router-dom'
import OnboardingPage from './pages/OnboardingPage'
import SimulationPage from './pages/SimulationPage'
import ReportPage from './pages/ReportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/sim/:sessionId" element={<SimulationPage />} />
        <Route path="/report/:sessionId" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}
