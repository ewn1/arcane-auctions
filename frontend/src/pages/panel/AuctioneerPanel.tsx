import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import type { CardResult, Lot, MyLotItem, MyLotsResponse } from '../../types'
import { formatBRL } from '../../utils/format'
import CardSearch from './CardSearch'
import CreateLotForm from './CreateLotForm'
import MyLotsList from './MyLotsList'
import styles from './Panel.module.css'

type Feedback = {
  kind: 'success' | 'error'
  text: string
  lotId?: number
} | null

function fetchMyLots() {
  return api<MyLotsResponse>('/my/lots/')
}

export default function AuctioneerPanel() {
  const [data, setData] = useState<MyLotsResponse | null>(null)
  const [loadError, setLoadError] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardResult | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    let active = true
    fetchMyLots()
      .then((response) => {
        if (active) setData(response)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    try {
      setData(await fetchMyLots())
    } catch (err) {
      setLoadError(errorMessage(err))
    }
  }

  async function handleCreated(lot: Lot) {
    setSelectedCard(null)
    setFeedback({
      kind: 'success',
      text: `O lote "${lot.title}" foi publicado!`,
      lotId: lot.id,
    })
    await refresh()
  }

  async function handleCancel(item: MyLotItem) {
    const message =
      item.bid_count > 0
        ? `"${item.title}" já tem ${item.bid_count} lance(s). Ao cancelar, os valores comprometidos voltam aos licitantes. Confirmar o cancelamento?`
        : `Cancelar o lote "${item.title}"?`
    if (!window.confirm(message)) return

    try {
      const response = await api<{ detail: string }>(
        `/lots/${item.id}/cancel/`,
        {
          method: 'POST',
        },
      )
      setFeedback({ kind: 'success', text: response.detail })
      await refresh()
    } catch (err) {
      setFeedback({ kind: 'error', text: errorMessage(err) })
    }
  }

  const lots = data?.lots ?? []
  const activeCount = lots.filter(
    (lot) => lot.status === 'live' || lot.status === 'scheduled',
  ).length
  const soldCount = lots.filter((lot) => lot.result === 'sold').length

  return (
    <section className={styles.panel}>
      <div className="page-header">
        <div>
          <h1>Painel do leiloeiro</h1>
          <p className="muted">
            Publique cartas, acompanhe as disputas e confira os resultados.
          </p>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={`card ${styles.stat}`}>
          <small className="muted">Total recebido</small>
          <strong className="gold">
            {formatBRL(data?.total_received ?? '0')}
          </strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <small className="muted">Lotes ativos</small>
          <strong>{activeCount}</strong>
        </div>
        <div className={`card ${styles.stat}`}>
          <small className="muted">Lotes arrematados</small>
          <strong>{soldCount}</strong>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert--${feedback.kind}`} role="status">
          {feedback.text}{' '}
          {feedback.lotId && (
            <Link to={`/lotes/${feedback.lotId}`}>Abrir a sala do lote</Link>
          )}
        </div>
      )}

      <section className={`card ${styles.section}`}>
        <h2>Publicar um novo lote</h2>
        {selectedCard ? (
          <CreateLotForm
            key={selectedCard.external_id}
            card={selectedCard}
            onCreated={handleCreated}
            onBack={() => setSelectedCard(null)}
          />
        ) : (
          <CardSearch onSelect={setSelectedCard} />
        )}
      </section>

      <section className={`card ${styles.section}`}>
        <h2>Seus lotes</h2>
        {loadError && <p className="alert alert--error">{loadError}</p>}
        {!data && !loadError ? (
          <p className="muted">Consultando o livro de registros...</p>
        ) : (
          <MyLotsList lots={lots} onCancel={handleCancel} />
        )}
      </section>
    </section>
  )
}
