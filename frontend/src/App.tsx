import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ServerGate from './components/ServerGate'
import { AuthProvider } from './context/AuthContext'
import ComingSoon from './pages/ComingSoon'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Showcase from './pages/Showcase'

export default function App() {
  return (
    <ServerGate>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Showcase />} />
            <Route path="login" element={<Login />} />
            <Route path="cadastro" element={<Register />} />
            <Route
              path="lotes/:id"
              element={<ComingSoon title="Sala do lote" />}
            />
            <Route path="carteira" element={<ComingSoon title="Carteira" />} />
            <Route
              path="meus-arremates"
              element={<ComingSoon title="Meus arremates" />}
            />
            <Route
              path="painel"
              element={<ComingSoon title="Painel do leiloeiro" />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ServerGate>
  )
}
