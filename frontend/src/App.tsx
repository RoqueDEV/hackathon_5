import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { IntakePage } from '@/pages/IntakePage'
import { ReviewerDashboardPage } from '@/pages/ReviewerDashboardPage'
import { AuditLogPage } from '@/pages/AuditLogPage'

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<IntakePage />} />
          <Route path="/review" element={<ReviewerDashboardPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
