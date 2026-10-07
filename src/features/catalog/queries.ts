import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListParams } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { qk } from '@/api/query-keys'

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: qk.nfts.list(params),
    queryFn: ({ signal }) => api.listNfts(params, { signal }),
    placeholderData: keepPreviousData,
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: qk.nfts.featured,
    queryFn: ({ signal }) => api.featured({ signal }),
    staleTime: 60_000,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: ({ signal }) => api.getNft(id, { signal }),
    retry: (count, error) => (error as { status?: number }).status !== 404 && count < 2,
  })
