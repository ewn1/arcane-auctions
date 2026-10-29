import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'
import styles from './Auth.module.css'

interface RegisterForm {
  username: string
  email: string
  password: string
  role: Role
}

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    role: 'bidder',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof RegisterForm) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api('/auth/register/', { method: 'POST', body: form, auth: false })
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.auth}>
      <h1>Criar conta</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          Usuário
          <input value={form.username} onChange={update('username')} required />
        </label>
        <label className="field">
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            required
          />
        </label>
        <label className="field">
          Quero entrar como
          <select value={form.role} onChange={update('role')}>
            <option value="bidder">Licitante (dar lances)</option>
            <option value="auctioneer">Leiloeiro (criar lotes)</option>
          </select>
        </label>
        {error && <p className="alert alert--error">{error}</p>}
        <button className="btn" disabled={submitting}>
          {submitting ? 'Registrando seu nome no grimório...' : 'Criar conta'}
        </button>
      </form>
      <p className="muted">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </section>
  )
}
