export type Role = 'auctioneer' | 'bidder'

export interface User {
  id: number
  username: string
  email: string
  role: Role
}

export interface TokenResponse {
  access: string
  refresh: string
}

export type LotStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface CardAttributes {
  set_name?: string
  rarity?: string
  type_line?: string
  artist?: string
  mana_cost?: string
}

export interface MyLotPosition {
  alias: string
  is_winning: boolean
  position: number | null
  my_top_bid: string | null
}

export interface Lot {
  id: number
  title: string
  image_url: string
  attributes: CardAttributes
  starting_price: string
  min_increment: string
  current_price: string | null
  starts_at: string
  ends_at: string
  status: LotStatus
  auctioneer: string
  bid_count: number
  created_at: string
  leader_alias: string | null
  min_next_bid: string
  me: MyLotPosition | null
}

export interface BidEntry {
  bidder: string
  amount: string
  created_at: string
  is_mine: boolean
}

export interface Wallet {
  total: string
  committed: string
  available: string
}

export type BidOutcome = 'winning' | 'outbid' | 'won' | 'lost' | 'cancelled'

export interface MyBid {
  lot_id: number
  title: string
  image_url: string
  status: LotStatus
  current_price: string
  my_top_bid: string
  outcome: BidOutcome
  receipt_token: string | null
}

export interface Receipt {
  receipt_code: string
  lot_id: number
  title: string
  image_url: string
  attributes: CardAttributes
  final_price: string
  winner: string
  auctioneer: string
  settled_at: string
  bid_count: number
  chain_seal: string
}

export interface AuditEntry {
  position: number
  bidder: string
  amount: string
  created_at: string
  hash: string
  valid: boolean
}

export interface AuditResult {
  lot_id: number
  title: string
  status: LotStatus
  is_intact: boolean
  problems: string[]
  bids: AuditEntry[]
}
