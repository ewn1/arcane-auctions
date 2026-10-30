import { Link } from 'react-router-dom'
import type { MyLotItem } from '../../types'
import { formatBRL, formatDateTime, statusLabel } from '../../utils/format'
import styles from './Panel.module.css'

interface MyLotsListProps {
  lots: MyLotItem[]
  onCancel: (item: MyLotItem) => void
}

function resultText(item: MyLotItem): string {
  if (item.result === 'sold') {
    return `Arrematado por ${item.winner} em ${formatBRL(item.current_price)}`
  }
  if (item.result === 'unsold') return 'Encerrado sem lances'
  if (item.status === 'cancelled') return 'Cancelado pelo leiloeiro'
  if (item.current_price) {
    return `Lance atual ${formatBRL(item.current_price)} · ${item.bid_count} lance(s)`
  }
  return `Lance inicial ${formatBRL(item.starting_price)} · sem lances ainda`
}

export default function MyLotsList({ lots, onCancel }: MyLotsListProps) {
  if (lots.length === 0) {
    return (
      <p className="muted">
        Você ainda não publicou nenhum lote. Que tal o primeiro?
      </p>
    )
  }

  return (
    <ul className={styles.lots}>
      {lots.map((item) => (
        <li key={item.id} className={styles.lotRow}>
          <img src={item.image_url} alt={item.title} />
          <div className={styles.lotInfo}>
            <div className={styles.lotTitle}>
              <strong>{item.title}</strong>
              <span className={`${styles.status} ${styles[item.status]}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <small>{resultText(item)}</small>
            <small className="muted">
              {formatDateTime(item.starts_at)} → {formatDateTime(item.ends_at)}
            </small>
          </div>
          <div className={styles.lotActions}>
            <Link to={`/lotes/${item.id}`} className="btn btn--ghost">
              Ver sala
            </Link>
            {item.can_cancel && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onCancel(item)}
              >
                Cancelar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
