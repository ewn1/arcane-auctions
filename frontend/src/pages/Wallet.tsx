import { useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../api/client'
import type { Wallet as WalletData } from '../types'
import { formatBRL } from '../utils/format'
import styles from './Wallet.module.css'

const QUICK_DEPOSITS = ['100.00', '500.00', '1000.00']

type Feedback = { kind: 'success' | 'error'; text: string } | null

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api<WalletData>('/wallet/')
      .then((data) => {
        if (active) setWallet(data)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      const updated = await api<WalletData>('/wallet/deposit/', {
        method: 'POST',
        body: { amount },
      })
      setWallet(updated)
      setFeedback({
        kind: 'success',
        text: `Seu cofre recebeu ${formatBRL(amount)}.`,
      })
      setAmount('')
    } catch (err) {
      setFeedback({ kind: 'error', text: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  if (!wallet) {
    return loadError ? (
      <p className="alert alert--error">{loadError}</p>
    ) : (
      <p className="empty">Abrindo o seu cofre...</p>
    )
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Seu cofre</h1>
          <p className="muted">
            Saldo simulado para disputar os lotes. Nenhum valor é real.
          </p>
        </div>
      </div>

      <div className={styles.balances}>
        <div className={`card ${styles.balance}`}>
          <small className="muted">Saldo total</small>
          <strong>{formatBRL(wallet.total)}</strong>
          <p className="muted">Tudo o que está no seu cofre.</p>
        </div>
        <div className={`card ${styles.balance}`}>
          <small className="muted">Comprometido</small>
          <strong className={styles.committed}>
            {formatBRL(wallet.committed)}
          </strong>
          <p className="muted">
            Reservado nos lotes em que você lidera. Volta na hora se for
            superado.
          </p>
        </div>
        <div className={`card ${styles.balance} ${styles.highlight}`}>
          <small className="muted">Disponível para lances</small>
          <strong className="gold">{formatBRL(wallet.available)}</strong>
          <p className="muted">Total menos comprometido.</p>
        </div>
      </div>

      <form
        className={`card form ${styles.depositForm}`}
        onSubmit={handleDeposit}
      >
        <h2>Depositar ouro</h2>
        <label className="field">
          Valor do depósito
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>
        <div className={styles.quick}>
          {QUICK_DEPOSITS.map((value) => (
            <button
              key={value}
              type="button"
              className="btn btn--ghost"
              onClick={() => setAmount(value)}
            >
              + {formatBRL(value)}
            </button>
          ))}
        </div>
        <button className="btn" disabled={submitting}>
          {submitting ? 'Guardando no cofre...' : 'Depositar'}
        </button>
        {feedback && (
          <p className={`alert alert--${feedback.kind}`}>{feedback.text}</p>
        )}
      </form>
    </section>
  )
}
