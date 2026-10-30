import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { AuditResult } from '../types'
import { formatBRL, formatDateTimeSeconds, shortHash } from '../utils/format'
import styles from './Audit.module.css'

export default function Audit() {
  const { id = '' } = useParams()
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    api<AuditResult>(`/lots/${id}/audit/`, { auth: false })
      .then((data) => {
        if (active) setAudit(data)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [id])

  if (!audit) {
    return loadError ? (
      <section className="empty">
        <h1>Auditoria indisponível</h1>
        <p>{loadError}</p>
        <Link to="/" className="btn">
          Voltar à vitrine
        </Link>
      </section>
    ) : (
      <p className="empty">Recalculando a cadeia de lances...</p>
    )
  }

  return (
    <section className={styles.audit}>
      <Link to={`/lotes/${audit.lot_id}`} className={styles.back}>
        ← Voltar à sala do lote
      </Link>

      <div className="page-header">
        <div>
          <h1>Auditoria do lote</h1>
          <p className="muted">{audit.title}</p>
        </div>
      </div>

      <div
        className={`${styles.verdict} ${audit.is_intact ? styles.intact : styles.tampered}`}
      >
        <span className={styles.icon} aria-hidden="true">
          {audit.is_intact ? '✓' : '✗'}
        </span>
        <div>
          <h2>
            {audit.is_intact ? 'Histórico íntegro' : 'Adulteração detectada'}
          </h2>
          {audit.is_intact ? (
            <p>
              Todos os lances conferem com a cadeia de assinaturas e com o selo
              do lote.
            </p>
          ) : (
            <ul>
              {audit.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className={`card ${styles.howItWorks}`}>
        <summary>Como funciona esta verificação?</summary>
        <p>
          Cada lance é assinado com uma chave secreta do servidor (HMAC-SHA256).
          A assinatura inclui os dados do lance e a assinatura do lance
          anterior, formando uma corrente: alterar, remover ou inserir um lance
          quebra todos os elos seguintes.
        </p>
        <p>
          O lote também guarda um selo com a quantidade de lances e a última
          assinatura, o que protege o final da corrente. Ao abrir esta página, o
          servidor recalcula tudo do zero e compara com o que está gravado.
        </p>
        <p>
          Os licitantes aparecem por pseudônimo: é possível auditar o histórico
          sem saber quem deu cada lance.
        </p>
      </details>

      {audit.bids.length === 0 ? (
        <p className="empty">Este lote ainda não recebeu lances.</p>
      ) : (
        <div className={`card ${styles.tableWrapper}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Licitante</th>
                <th scope="col">Valor</th>
                <th scope="col">Horário</th>
                <th scope="col">Assinatura</th>
                <th scope="col">Elo</th>
              </tr>
            </thead>
            <tbody>
              {audit.bids.map((bid) => (
                <tr
                  key={bid.position}
                  className={bid.valid ? undefined : styles.invalidRow}
                >
                  <td>{bid.position}</td>
                  <td>{bid.bidder}</td>
                  <td>{formatBRL(bid.amount)}</td>
                  <td>{formatDateTimeSeconds(bid.created_at)}</td>
                  <td className={styles.hash} title={bid.hash}>
                    {shortHash(bid.hash)}
                  </td>
                  <td>
                    {bid.valid ? (
                      <span className={styles.ok}>✓ válido</span>
                    ) : (
                      <span className={styles.bad}>✗ inválido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
