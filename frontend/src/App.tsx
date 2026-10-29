import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ServerGate from './components/ServerGate'
import { AuthProvider } from './context/AuthContext'
import ComingSoon from './pages/ComingSoon'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Showcase from './pages/Showcase'
import LotRoom from './pages/LotRoom'
import RequireRole from './components/RequireRole'
import Audit from './pages/Audit'
import MyBids from './pages/MyBids'
import Receipt from './pages/Receipt'
import Wallet from './pages/Wallet'

export default function App() {
  return (
    <ServerGate>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Showcase />} />
            <Route path="login" element={<Login />} />
            <Route path="cadastro" element={<Register />} />
            <Route path="lotes/:id" element={<LotRoom />} />
            <Route path="lotes/:id/auditoria" element={<Audit />} />
            <Route path="comprovante/:token" element={<Receipt />} />
            <Route
              path="carteira"
              element={
                <RequireRole role="bidder">
                  <Wallet />
                </RequireRole>
              }
            />
            <Route
              path="meus-arremates"
              element={
                <RequireRole role="bidder">
                  <MyBids />
                </RequireRole>
              }
            />
            <Route
              path="painel"
              element={
                <RequireRole role="auctioneer">
                  <ComingSoon title="Painel do leiloeiro" />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ServerGate>
  )
}
