import styles from './SummoningLoader.module.css'

export default function SummoningLoader({
  failed = false,
}: {
  failed?: boolean
}) {
  return (
    <div
      className={`${styles.summon} ${failed ? styles.failed : ''}`}
      aria-hidden="true"
    >
      <div className={styles.circle} />
      <div className={styles.card}>
        <span>✦</span>
      </div>
    </div>
  )
}
