import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import LotCard from '../components/LotCard'
import type { Lot } from '../types'
import styles from './Showcase.module.css'

type TabKey = 'live' | 'scheduled' | 'ended'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'live', label: 'Ao vivo' },
  { key: 'scheduled', label: 'Agendados' },
  { key: 'ended', label: 'Encerrados' },
]

interface ShowcaseResult {
  tab: TabKey | null
  lots: Lot[]
  error: string
}

export default function Showcase() {
  const [tab, setTab] = useState<TabKey>('live')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ShowcaseResult>({
    tab: null,
    lots: [],
    error: '',
  })

  useEffect(() => {
    let active = true
    api<Lot[]>(`/lots/?status=${tab}`)
      .then((lots) => active && setResult({ tab, lots, error: '' }))
      .catch(
        (err: unknown) =>
          active && setResult({ tab, lots: [], error: errorMessage(err) }),
      )
    return () => {
      active = false
    }
  }, [tab])

  const loading = result.tab !== tab
  const term = query.trim().toLowerCase()
  const filtered = result.lots.filter((lot) =>
    lot.title.toLowerCase().includes(term),
  )

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Vitrine de lotes</h1>
          <p className="muted">Cartas raras aguardando seu lance.</p>
        </div>
        <input
          className={styles.search}
          type="search"
          placeholder="Buscar carta..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            className={`tab ${tab === item.key ? 'tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {result.error && <p className="alert alert--error">{result.error}</p>}

      {loading ? (
        <p className="empty">Consultando os arquivos arcanos...</p>
      ) : filtered.length === 0 ? (
        <p className="empty">Nenhum lote encontrado por aqui.</p>
      ) : (
        <div className="grid">
          {filtered.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </section>
  )
}
