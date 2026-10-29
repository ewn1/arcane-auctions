import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import type { CardResult, Lot } from '../../types'
import { formatBRL, rarityLabel, toDateTimeLocal } from '../../utils/format'
import styles from './Panel.module.css'

const DURATIONS = [
  { value: '10', label: '10 minutos' },
  { value: '60', label: '1 hora' },
  { value: '360', label: '6 horas' },
  { value: '1440', label: '1 dia' },
  { value: '4320', label: '3 dias' },
  { value: '10080', label: '7 dias' },
  { value: 'custom', label: 'Personalizado' },
]

interface CreateLotFormProps {
  card: CardResult
  onCreated: (lot: Lot) => void
  onBack: () => void
}

export default function CreateLotForm({
  card,
  onCreated,
  onBack,
}: CreateLotFormProps) {
  const [startingPrice, setStartingPrice] = useState('100.00')
  const [minIncrement, setMinIncrement] = useState('10.00')
  const [startNow, setStartNow] = useState(true)
  const [startsAt, setStartsAt] = useState(() => toDateTimeLocal(new Date()))
  const [duration, setDuration] = useState('1440')
  const [endsAt, setEndsAt] = useState(() =>
    toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const start = startNow ? new Date() : new Date(startsAt)
    const end =
      duration === 'custom'
        ? new Date(endsAt)
        : new Date(start.getTime() + Number(duration) * 60 * 1000)

    setSubmitting(true)
    try {
      const lot = await api<Lot>('/lots/', {
        method: 'POST',
        body: {
          external_id: card.external_id,
          starting_price: startingPrice,
          min_increment: minIncrement,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        },
      })
      onCreated(lot)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const rarity = card.attributes.rarity

  return (
    <form className={styles.createForm} onSubmit={handleSubmit}>
      <div className={styles.chosen}>
        <img src={card.image_url} alt={card.title} />
        <div>
          <strong>{card.title}</strong>
          <small className="muted">
            {card.attributes.set_name}
            {rarity && ` · ${rarityLabel(rarity)}`}
          </small>
          <small className="muted">{card.attributes.type_line}</small>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ← Escolher outra carta
          </button>
        </div>
      </div>

      <div className={styles.fields}>
        <label className="field">
          Lance inicial (R$)
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={startingPrice}
            onChange={(event) => setStartingPrice(event.target.value)}
            required
          />
        </label>
        <label className="field">
          Incremento mínimo (R$)
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={minIncrement}
            onChange={(event) => setMinIncrement(event.target.value)}
            required
          />
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={startNow}
            onChange={(event) => setStartNow(event.target.checked)}
          />
          Começar imediatamente
        </label>
        {!startNow && (
          <label className="field">
            Início
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
        )}

        <label className="field">
          Duração
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          >
            {DURATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {duration === 'custom' && (
          <label className="field">
            Fim
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </label>
        )}
      </div>

      <p className="muted">
        Os lances começam em {formatBRL(startingPrice || '0')} e sobem de{' '}
        {formatBRL(minIncrement || '0')} em {formatBRL(minIncrement || '0')}.
        Lances nos últimos 2 minutos prorrogam o fim em 2 minutos.
      </p>

      {error && <p className="alert alert--error">{error}</p>}

      <button className="btn" disabled={submitting}>
        {submitting ? 'Selando o lote...' : 'Publicar lote'}
      </button>
    </form>
  )
}
