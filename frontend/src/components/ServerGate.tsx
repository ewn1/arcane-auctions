import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { Lot } from '../types'
import styles from './ServerGate.module.css'
import SummoningLoader from './SummoningLoader'

const SLOW_AFTER_MS = 1500

type GateState = 'checking' | 'slow' | 'ready' | 'error'

export default function ServerGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    const timer = setTimeout(() => {
      if (active) {
        setState((current) => (current === 'checking' ? 'slow' : current))
      }
    }, SLOW_AFTER_MS)

    api<Lot[]>('/lots/?status=live', { auth: false })
      .then(() => active && setState('ready'))
      .catch(() => active && setState('error'))
      .finally(() => clearTimeout(timer))

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [attempt])

  function retry() {
    setState('checking')
    setAttempt((current) => current + 1)
  }

  if (state === 'ready') return <>{children}</>
  if (state === 'checking') return null

  if (state === 'error') {
    return (
      <div className={styles.gate}>
        <SummoningLoader failed />
        <h1>O servidor não atendeu ao chamado</h1>
        <p className="muted">Verifique sua conexão e tente novamente.</p>
        <button className="btn" onClick={retry}>
          Tentar invocar de novo
        </button>
      </div>
    )
  }

  return (
    <div className={styles.gate}>
      <SummoningLoader />
      <h1>Invocando o servidor...</h1>
      <p className="muted">
        Nosso servidor gratuito adormece após 15 minutos sem uso. O despertar
        pode levar até 1 minuto.
      </p>
    </div>
  )
}
