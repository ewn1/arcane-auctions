import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Receipt as ReceiptData } from '../types'
import { copyText } from '../utils/clipboard'
import {
  formatBRL,
  formatDateTime,
  rarityLabel,
  shortHash,
} from '../utils/format'
import styles from './Receipt.module.css'

export default function Receipt() {
  const { token = '' } = useParams()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    api<ReceiptData>(`/receipts/${token}/`, { auth: false })
      .then((data) => {
        if (active) setReceipt(data)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [token])

  async function handleCopy() {
    const ok = await copyText(window.location.href)
    setCopied(ok)
    if (!ok) window.prompt('Copie o link do comprovante:', window.location.href)
  }

  if (!receipt) {
    return loadError ? (
      <section className="empty">
        <h1>Comprovante não encontrado</h1>
        <p>{loadError}</p>
        <Link to="/" className="btn">
          Voltar à vitrine
        </Link>
      </section>
    ) : (
      <p className="empty">Desenrolando o pergaminho...</p>
    )
  }

  const rarity = receipt.attributes.rarity

  return (
    <section className={styles.wrapper}>
      <article className={styles.receipt}>
        <header className={styles.header}>
          <span className={styles.seal} aria-hidden="true">
            ✦
          </span>
          <h1>Comprovante de arremate</h1>
          <p className="muted">
            Arcane Auctions · Código {receipt.receipt_code}
          </p>
        </header>

        <div className={styles.body}>
          <img
            src={receipt.image_url}
            alt={receipt.title}
            className={styles.image}
          />
          <dl className={styles.details}>
            <div>
              <dt>Carta</dt>
              <dd>{receipt.title}</dd>
            </div>
            {rarity && (
              <div>
                <dt>Raridade</dt>
                <dd>{rarityLabel(rarity)}</dd>
              </div>
            )}
            <div>
              <dt>Coleção</dt>
              <dd>{receipt.attributes.set_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Valor de arremate</dt>
              <dd className={styles.price}>{formatBRL(receipt.final_price)}</dd>
            </div>
            <div>
              <dt>Arrematante</dt>
              <dd>{receipt.winner}</dd>
            </div>
            <div>
              <dt>Leiloeiro</dt>
              <dd>{receipt.auctioneer}</dd>
            </div>
            <div>
              <dt>Liquidado em</dt>
              <dd>{formatDateTime(receipt.settled_at)}</dd>
            </div>
            <div>
              <dt>Lances no histórico</dt>
              <dd>{receipt.bid_count}</dd>
            </div>
            <div>
              <dt>Selo da cadeia</dt>
              <dd className={styles.hash} title={receipt.chain_seal}>
                {shortHash(receipt.chain_seal)}
              </dd>
            </div>
          </dl>
        </div>

        <footer className={styles.footer}>
          <p className="muted">
            O arrematante é identificado por pseudônimo, sem dados pessoais. A
            integridade do histórico pode ser verificada publicamente.
          </p>
          <div className={`${styles.actions} no-print`}>
            <Link
              to={`/lotes/${receipt.lot_id}/auditoria`}
              className="btn btn--ghost"
            >
              Verificar integridade
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCopy}
            >
              {copied ? 'Link copiado!' : 'Copiar link'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>
        </footer>
      </article>
    </section>
  )
}
