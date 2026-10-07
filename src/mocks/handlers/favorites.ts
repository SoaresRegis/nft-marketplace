import { HttpResponse, http } from 'msw'
import { db, findNft, persist } from '../db'
import { fail, requireUser } from '../http-utils'

const list = (userId: string) => (db.favorites[userId] ??= [])

export const favoriteHandlers = [
  http.get('*/api/me/favorites', ({ request }) => {
    const userId = requireUser(request)
    return HttpResponse.json({ nftIds: list(userId) })
  }),
  http.put('*/api/me/favorites/:nftId', ({ request, params }) => {
    const userId = requireUser(request)
    const nft = findNft(String(params.nftId))
    if (!nft) return fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    const favs = list(userId)
    if (!favs.includes(nft.id)) {
      favs.push(nft.id)
      nft.likes += 1
    }
    persist()
    return HttpResponse.json({ nftIds: favs })
  }),
  http.delete('*/api/me/favorites/:nftId', ({ request, params }) => {
    const userId = requireUser(request)
    const id = String(params.nftId)
    const favs = list(userId)
    if (favs.includes(id)) {
      db.favorites[userId] = favs.filter((f) => f !== id)
      const nft = findNft(id)
      if (nft) nft.likes = Math.max(0, nft.likes - 1)
    }
    persist()
    return HttpResponse.json({ nftIds: db.favorites[userId] })
  }),
]
