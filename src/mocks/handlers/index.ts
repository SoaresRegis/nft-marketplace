import { networkConditions } from '../network'
import { realtimeHandler } from '../realtime'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { controlHandlers } from './control'
import { favoriteHandlers } from './favorites'
import { newsletterHandlers } from './newsletter'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'

export const handlers = [
  networkConditions,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...newsletterHandlers,
  ...controlHandlers,
  realtimeHandler,
]
