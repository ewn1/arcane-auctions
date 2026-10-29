import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Layout.module.css'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink

export default function Layout() {
  const { user, isAuctioneer, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          ✦ Arcane Auctions
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/" end className={navClass}>
            Vitrine
          </NavLink>
          {user && !isAuctioneer && (
            <>
              <NavLink to="/carteira" className={navClass}>
                Carteira
              </NavLink>
              <NavLink to="/meus-arremates" className={navClass}>
                Meus arremates
              </NavLink>
            </>
          )}
          {isAuctioneer && (
            <NavLink to="/painel" className={navClass}>
              Painel do leiloeiro
            </NavLink>
          )}
        </nav>

        <div className={styles.user}>
          {user ? (
            <>
              <span className="muted">{user.username}</span>
              <button className="btn btn--ghost" onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="btn">
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        Dados e imagens das cartas fornecidos pelo{' '}
        <a href="https://scryfall.com" target="_blank" rel="noreferrer">
          Scryfall
        </a>
        . Magic: The Gathering é marca da Wizards of the Coast. Projeto de
        demonstração, sem valores reais.
      </footer>
    </div>
  )
}
