import type { LotStatus } from '../types'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return brl.format(Number(value))
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days) return `${days}d ${hours}h`
  if (hours) return `${hours}h ${minutes}min`
  if (minutes) return `${minutes}min ${seconds}s`
  return `${seconds}s`
}

const RARITIES: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  mythic: 'Mítica',
  special: 'Especial',
  bonus: 'Bônus',
}

export function rarityLabel(rarity: string): string {
  return RARITIES[rarity] ?? rarity
}

export function formatDateTimeSeconds(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function addMoney(
  base: string,
  increment: string,
  times: number,
): string {
  return (Number(base) + Number(increment) * times).toFixed(2)
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

const STATUS_LABELS: Record<LotStatus, string> = {
  scheduled: 'Agendado',
  live: 'Ao vivo',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
}

export function statusLabel(status: LotStatus): string {
  return STATUS_LABELS[status]
}

export function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
