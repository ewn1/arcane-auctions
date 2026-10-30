import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, errorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useNow } from '../hooks/useNow'
import type { BidEntry, Lot } from '../types'
import {
  addMoney,
  formatBRL,
  formatDateTime,
  formatDateTimeSeconds,
  formatDuration,
  rarityLabel,
} from '../utils/format'
import styles from './LotRoom.module.css'

const POLL_MS = 3000
const ANTI_SNIPING_MS = 2 * 60 * 1000

interface RoomData {
  lot: Lot
  bids: BidEntry[]
}

type Feedback = {
  kind: 'success' | 'error'
  title: string
  detail: string
} | null

const REJECTION_TITLES: Record<string, string> = {
  below_minimum: 'Oferta modesta demais',
  insufficient_balance: 'Seu cofre não comporta este lance',
  already_winning: 'Você já lidera este lote',
  not_started: 'O leilão ainda não começou',
  ended: 'O martelo já foi batido',
  cancelled: 'Este lote foi cancelado',
  auctioneer: 'Leiloeiros não dão lances',
}

async function fetchRoom(id: string): Promise<RoomData> {
  const [lot, bids] = await Promise.all([
    api<Lot>(`/lots/${id}/`),
    api<BidEntry[]>(`/lots/${id}/bids/`),
  ])
  return { lot, bids }
}

function StatusBanner({ lot }: { lot: Lot }) {
  if (lot.status === 'cancelled') {
    return (
      <div className={`${styles.banner} ${styles.neutral}`}>
        Este lote foi cancelado pelo leiloeiro. Os valores comprometidos foram
        liberados.
      </div>
    )
  }

  const me = lot.me
  if (!me || me.position === null) return null

  if (lot.status === 'ended') {
    return me.is_winning ? (
      <div className={`${styles.banner} ${styles.won}`}>
        <span aria-hidden="true">🏆</span> Você arrematou este lote por{' '}
        {formatBRL(lot.current_price)}! O comprovante está em{' '}
        <Link to="/meus-arremates">Meus arremates</Link>.
      </div>
    ) : (
      <div className={`${styles.banner} ${styles.neutral}`}>
        O lote foi arrematado por outro licitante. Seu maior lance foi{' '}
        {formatBRL(me.my_top_bid)}.
      </div>
    )
  }

  return me.is_winning ? (
    <div className={`${styles.banner} ${styles.winning}`}>
      ✦ Você está ganhando! Seu lance de {formatBRL(me.my_top_bid)} lidera a
      disputa.
    </div>
  ) : (
    <div className={`${styles.banner} ${styles.outbid}`}>
      Você foi superado! Seu maior lance: {formatBRL(me.my_top_bid)} (
      {me.position}º lugar). Dê um novo lance para retomar a liderança.
    </div>
  )
}

export default function LotRoom() {
  const { id = '' } = useParams()
  const { user, isAuctioneer } = useAuth()
  const now = useNow(1000)
  const [room, setRoom] = useState<RoomData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    function load() {
      fetchRoom(id)
        .then((data) => {
          if (!active) return
          setRoom(data)
          setLoadError('')
        })
        .catch((err: unknown) => {
          if (active) setLoadError(errorMessage(err))
        })
    }

    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [id])

  async function handleBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!room) return

    const value = amount || room.lot.min_next_bid
    setSubmitting(true)
    setFeedback(null)

    try {
      const updatedLot = await api<Lot>(`/lots/${id}/bids/`, {
        method: 'POST',
        body: { amount: value },
      })
      setRoom((current) =>
        current ? { ...current, lot: updatedLot } : current,
      )
      setFeedback({
        kind: 'success',
        title: 'Lance aceito!',
        detail: `Você ofereceu ${formatBRL(value)} e agora lidera este lote.`,
      })
      setAmount('')
      setRoom(await fetchRoom(id))
    } catch (err) {
      const code =
        err instanceof ApiError && typeof err.data?.code === 'string'
          ? err.data.code
          : ''
      setFeedback({
        kind: 'error',
        title: REJECTION_TITLES[code] ?? 'Lance recusado',
        detail: errorMessage(err),
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room) {
    return loadError ? (
      <section className="empty">
        <h1>A sala não pôde ser aberta</h1>
        <p>{loadError}</p>
        <Link to="/" className="btn">
          Voltar à vitrine
        </Link>
      </section>
    ) : (
      <p className="empty">Abrindo a sala do lote...</p>
    )
  }

  const { lot, bids } = room
  const startsIn = new Date(lot.starts_at).getTime() - now
  const endsIn = new Date(lot.ends_at).getTime() - now
  const isLive = lot.status === 'live' && endsIn > 0
  const inSnipingWindow = isLive && endsIn <= ANTI_SNIPING_MS
  const isBidder = Boolean(user) && !isAuctioneer
  const isWinning = Boolean(lot.me?.is_winning)
  const hasBids = lot.current_price !== null
  const suggestions = [0, 1, 5].map((n) =>
    addMoney(lot.min_next_bid, lot.min_increment, n),
  )
  const rarity = lot.attributes.rarity

  let countdownLabel = 'Encerrado em'
  let countdownValue = formatDateTime(lot.ends_at)
  if (lot.status === 'scheduled') {
    countdownLabel = 'Começa em'
    countdownValue = formatDuration(startsIn)
  } else if (lot.status === 'live') {
    countdownLabel = 'Termina em'
    countdownValue = endsIn > 0 ? formatDuration(endsIn) : 'Encerrando...'
  } else if (lot.status === 'cancelled') {
    countdownLabel = 'Status'
    countdownValue = 'Cancelado'
  }

  const leaderTag = lot.status === 'ended' ? 'Vencedor' : 'Líder'

  return (
    <section className={styles.room}>
      <Link to="/" className={styles.back}>
        ← Voltar à vitrine
      </Link>

      <div className={styles.layout}>
        <div className={styles.cardColumn}>
          <div className={styles.cardImage}>
            <img src={lot.image_url} alt={lot.title} />
          </div>
          <dl className={`card ${styles.attributes}`}>
            <div>
              <dt>Coleção</dt>
              <dd>{lot.attributes.set_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{lot.attributes.type_line ?? '—'}</dd>
            </div>
            <div>
              <dt>Custo de mana</dt>
              <dd>{lot.attributes.mana_cost || '—'}</dd>
            </div>
            <div>
              <dt>Artista</dt>
              <dd>{lot.attributes.artist ?? '—'}</dd>
            </div>
            <div>
              <dt>Leiloeiro</dt>
              <dd>{lot.auctioneer}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <header className={styles.header}>
            {rarity && (
              <span className={`rarity rarity--${rarity}`}>
                {rarityLabel(rarity)}
              </span>
            )}
            <h1>{lot.title}</h1>
          </header>

          <StatusBanner lot={lot} />

          <div className={`card ${styles.priceCard}`}>
            <div>
              <small className="muted">
                {hasBids ? 'Lance atual' : 'Lance inicial'}
              </small>
              <strong className={styles.price}>
                {formatBRL(hasBids ? lot.current_price : lot.starting_price)}
              </strong>
              {lot.leader_alias && (
                <small className="muted">
                  {leaderTag}: {lot.leader_alias}
                </small>
              )}
            </div>
            <div
              className={`${styles.countdown} ${inSnipingWindow ? styles.urgent : ''}`}
            >
              <small className="muted">{countdownLabel}</small>
              <strong>{countdownValue}</strong>
            </div>
          </div>

          <dl className={styles.facts}>
            <div>
              <dt>Lance inicial</dt>
              <dd>{formatBRL(lot.starting_price)}</dd>
            </div>
            <div>
              <dt>Incremento mínimo</dt>
              <dd>{formatBRL(lot.min_increment)}</dd>
            </div>
            <div>
              <dt>Lances</dt>
              <dd>{lot.bid_count}</dd>
            </div>
          </dl>

          {inSnipingWindow && (
            <p className={styles.snipingNote}>
              <span aria-hidden="true">⚡</span> Reta final! Cada lance agora
              prorroga o leilão em 2 minutos.
            </p>
          )}

          {isLive && isBidder && (
            <form
              className={`card form ${styles.bidForm}`}
              onSubmit={handleBid}
            >
              <label className="field">
                Seu lance (mínimo {formatBRL(lot.min_next_bid)})
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={lot.min_next_bid}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isWinning}
                />
              </label>
              <div className={styles.quick}>
                {suggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setAmount(value)}
                    disabled={isWinning}
                  >
                    {formatBRL(value)}
                  </button>
                ))}
              </div>
              <button className="btn" disabled={submitting || isWinning}>
                {isWinning
                  ? 'Você já lidera'
                  : submitting
                    ? 'Selando o lance...'
                    : 'Dar lance'}
              </button>
            </form>
          )}

          {isLive && !user && (
            <div className="card">
              <p>Quer disputar esta carta?</p>
              <Link to="/login" className="btn">
                Entrar para dar lances
              </Link>
            </div>
          )}

          {isLive && isAuctioneer && (
            <p className="muted">
              Você está como leiloeiro: pode acompanhar, mas os lances são
              exclusivos dos licitantes.
            </p>
          )}

          {feedback && (
            <div className={`alert alert--${feedback.kind}`} role="status">
              <strong>{feedback.title}</strong>
              <div>{feedback.detail}</div>
            </div>
          )}
        </div>
      </div>

      <section className={`card ${styles.history}`}>
        <div className={styles.historyHeader}>
          <h2>Histórico de lances</h2>
          <Link to={`/lotes/${lot.id}/auditoria`}>Auditar histórico</Link>
        </div>
        {bids.length === 0 ? (
          <p className="muted">
            Nenhum lance ainda. Seja o primeiro a disputar!
          </p>
        ) : (
          <ol className={styles.bidList}>
            {bids.map((bid, index) => (
              <li
                key={`${bid.created_at}-${index}`}
                className={bid.is_mine ? styles.mine : undefined}
              >
                <span>
                  {bid.bidder}
                  {bid.is_mine && ' (você)'}
                  {index === 0 && lot.status !== 'cancelled' && (
                    <span className={styles.leaderTag}>{leaderTag}</span>
                  )}
                </span>
                <strong>{formatBRL(bid.amount)}</strong>
                <small className="muted">
                  {formatDateTimeSeconds(bid.created_at)}
                </small>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  )
}
