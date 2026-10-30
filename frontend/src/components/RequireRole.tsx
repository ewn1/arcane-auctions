import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'

const ROLE_LABELS: Record<Role, string> = {
  bidder: 'licitantes',
  auctioneer: 'leiloeiros',
}

export default function RequireRole({
  role,
  children,
}: {
  role: Role
  children: ReactNode
}) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <p className="empty">Verificando suas credenciais...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.role !== role) {
    return (
      <section className="empty">
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva para {ROLE_LABELS[role]}.</p>
        <Link to="/" className="btn">
          Voltar à vitrine
        </Link>
      </section>
    )
  }

  return <>{children}</>
}
