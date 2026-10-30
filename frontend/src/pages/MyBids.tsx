import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { BidOutcome, MyBid } from '../types'
import { copyText } from '../utils/clipboard'
import { formatBRL } from '../utils/format'
import styles from './MyBids.module.css'

const OUTCOMES: Record<BidOutcome, { label: string; className: string }> = {
  winning: { label: 'Ganhando', className: styles.winning },
  outbid: { label: 'Superado', className: styles.outbid },
  won: { label: 'Arrematado', className: styles.won },
  lost: { label: 'Não arrematado', className: styles.neutral },
  cancelled: { label: 'Lote cancelado', className: styles.neutral },
}

export default function MyBids() {
  const [items, setItems] = useState<MyBid[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<MyBid[]>('/my/bids/')
      .then((data) => {
        if (active) setItems(data)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  async function handleCopy(token: string) {
    const link = `${window.location.origin}/comprovante/${token}`
    const copied = await copyText(link)
    setCopiedToken(copied ? token : null)
    if (!copied) window.prompt('Copie o link do comprovante:', link)
  }

  if (!items) {
    return loadError ? (
      <p className="alert alert--error">{loadError}</p>
    ) : (
      <p className="empty">Consultando seus pergaminhos de lances...</p>
    )
  }

  const wonCount = items.filter((item) => item.outcome === 'won').length

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Meus arremates</h1>
          <p className="muted">
            {items.length}{' '}
            {items.length === 1 ? 'lote disputado' : 'lotes disputados'} ·{' '}
            {wonCount} {wonCount === 1 ? 'arrematado' : 'arrematados'}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <p>Você ainda não deu nenhum lance.</p>
          <Link to="/" className="btn">
            Explorar a vitrine
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const outcome = OUTCOMES[item.outcome]
            return (
              <li key={item.lot_id} className={`card ${styles.item}`}>
                <img
                  src={item.image_url}
                  alt={item.title}
                  className={styles.thumb}
                />
                <div className={styles.info}>
                  <span className={`${styles.badge} ${outcome.className}`}>
                    {outcome.label}
                  </span>
                  <h3>{item.title}</h3>
                  <p className="muted">
                    Seu maior lance:{' '}
                    <strong>{formatBRL(item.my_top_bid)}</strong> · Lance atual:{' '}
                    <strong>{formatBRL(item.current_price)}</strong>
                  </p>
                </div>
                <div className={styles.actions}>
                  <Link to={`/lotes/${item.lot_id}`} className="btn btn--ghost">
                    Ver sala
                  </Link>
                  {item.receipt_token && (
                    <>
                      <Link
                        to={`/comprovante/${item.receipt_token}`}
                        className="btn"
                      >
                        Comprovante
                      </Link>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => handleCopy(item.receipt_token!)}
                      >
                        {copiedToken === item.receipt_token
                          ? 'Link copiado!'
                          : 'Copiar link'}
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
