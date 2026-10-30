import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { CardResult } from '../../types'
import { rarityLabel } from '../../utils/format'
import styles from './Panel.module.css'

const DEBOUNCE_MS = 500
const MIN_CHARS = 3

interface SearchState {
  query: string
  results: CardResult[]
  error: string
}

export default function CardSearch({
  onSelect,
}: {
  onSelect: (card: CardResult) => void
}) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>({
    query: '',
    results: [],
    error: '',
  })

  const term = query.trim()
  const canSearch = term.length >= MIN_CHARS

  useEffect(() => {
    if (!canSearch) return

    let active = true
    const timer = setTimeout(() => {
      api<CardResult[]>(`/cards/search/?q=${encodeURIComponent(term)}`)
        .then((results) => {
          if (active) setSearch({ query: term, results, error: '' })
        })
        .catch((err: unknown) => {
          if (active)
            setSearch({ query: term, results: [], error: errorMessage(err) })
        })
    }, DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [term, canSearch])

  const isCurrent = search.query === term
  const searching = canSearch && !isCurrent

  return (
    <div className={styles.search}>
      <label className="field">
        Buscar carta no catálogo do Scryfall
        <input
          type="search"
          placeholder="Ex.: dragon, angel, Black Lotus..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      </label>

      {!canSearch && (
        <p className="muted">
          Digite pelo menos {MIN_CHARS} letras para consultar o catálogo.
        </p>
      )}
      {searching && <p className="muted">Consultando o catálogo arcano...</p>}
      {canSearch && isCurrent && search.error && (
        <p className="alert alert--error">{search.error}</p>
      )}
      {canSearch &&
        isCurrent &&
        !search.error &&
        search.results.length === 0 && (
          <p className="muted">Nenhuma carta encontrada para "{term}".</p>
        )}

      {canSearch && isCurrent && search.results.length > 0 && (
        <ul className={styles.results}>
          {search.results.map((card) => (
            <li key={card.external_id} className={styles.result}>
              <img src={card.image_url} alt={card.title} loading="lazy" />
              <div>
                <strong>{card.title}</strong>
                <small className="muted">
                  {card.attributes.set_name}
                  {card.attributes.rarity &&
                    ` · ${rarityLabel(card.attributes.rarity)}`}
                </small>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => onSelect(card)}
              >
                Escolher
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
