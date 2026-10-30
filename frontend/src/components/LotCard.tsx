import { Link } from 'react-router-dom'
import { useNow } from '../hooks/useNow'
import type { Lot } from '../types'
import { formatBRL, formatDuration, rarityLabel } from '../utils/format'
import styles from './LotCard.module.css'

function timeLabel(lot: Lot, now: number): string {
  if (lot.status === 'scheduled') {
    return `Começa em ${formatDuration(new Date(lot.starts_at).getTime() - now)}`
  }
  if (lot.status === 'live') {
    const remaining = new Date(lot.ends_at).getTime() - now
    return remaining > 0
      ? `Termina em ${formatDuration(remaining)}`
      : 'Encerrando...'
  }
  return 'Encerrado'
}

export default function LotCard({ lot }: { lot: Lot }) {
  const now = useNow(1000)
  const hasBids = lot.current_price !== null
  const rarity = lot.attributes.rarity

  return (
    <Link to={`/lotes/${lot.id}`} className={styles.lotCard}>
      <div className={styles.image}>
        <img src={lot.image_url} alt={lot.title} loading="lazy" />
      </div>
      <div className={styles.body}>
        {rarity && (
          <span className={`rarity rarity--${rarity}`}>
            {rarityLabel(rarity)}
          </span>
        )}
        <h3>{lot.title}</h3>
        <p className="muted">{lot.attributes.set_name}</p>
        <div className={styles.footer}>
          <div>
            <small className="muted">
              {hasBids ? 'Lance atual' : 'Lance inicial'}
            </small>
            <strong className="gold">
              {formatBRL(hasBids ? lot.current_price : lot.starting_price)}
            </strong>
          </div>
          <small className="muted">{timeLabel(lot, now)}</small>
        </div>
      </div>
    </Link>
  )
}
