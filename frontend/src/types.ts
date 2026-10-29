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
