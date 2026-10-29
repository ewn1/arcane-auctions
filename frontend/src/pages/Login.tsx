import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import styles from './Auth.module.css'

const DEMO_USERS = [
  { username: 'leiloeiro', label: 'Leiloeiro' },
  { username: 'licitante1', label: 'Licitante 1' },
  { username: 'licitante2', label: 'Licitante 2' },
]
const DEMO_PASSWORD = 'Arcane@2026'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      const wrongCredentials = err instanceof ApiError && err.status === 401
      setError(
        wrongCredentials ? 'Usuário ou senha incorretos.' : errorMessage(err),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo(demoUsername: string) {
    setUsername(demoUsername)
    setPassword(DEMO_PASSWORD)
  }

  return (
    <section className={styles.auth}>
      <h1>Entrar no salão</h1>

      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          Usuário
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="alert alert--error">{error}</p>}
        <button className="btn" disabled={submitting}>
          {submitting ? 'Abrindo os portões...' : 'Entrar'}
        </button>
      </form>

      <div className={`card ${styles.demo}`}>
        <strong>Contas de demonstração</strong>
        <p className="muted">
          Clique para preencher. Senha de todas: {DEMO_PASSWORD}
        </p>
        <div className={styles.demoButtons}>
          {DEMO_USERS.map((demo) => (
            <button
              key={demo.username}
              type="button"
              className="btn btn--ghost"
              onClick={() => fillDemo(demo.username)}
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      <p className="muted">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </section>
  )
}
