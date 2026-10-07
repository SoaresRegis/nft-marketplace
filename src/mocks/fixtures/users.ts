import type { Wallet } from '@/api/contracts'

export interface UserRecord {
  id: string
  name: string
  username: string
  email: string
  bio: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  createdAt: string
  /** sha256(salt + ':' + senha). Senhas nunca ficam em claro. */
  passwordHash: string
  salt: string
}

/** Credenciais fictícias de demonstração: senha "Senha@123" para ambos. */
export const DEMO_PASSWORD = 'Senha@123'

export function buildUsers(): UserRecord[] {
  return [
    {
      id: 'usr-ana',
      name: 'Ana Colecionadora',
      username: 'ana',
      email: 'ana@nft.dev',
      bio: 'Coleciono arte generativa desde 2021.',
      ensName: 'anacoleciona',
      walletNickname: 'Cofre da Ana',
      avatarUrl: '/avatars/user-ana.svg',
      createdAt: '2026-01-10T12:00:00.000Z',
      salt: 's4lt-ana',
      passwordHash: '9353a8b24bed158576326e5be096ae8c52c9c2dea3c47a018fb6bd374b7462e9',
    },
    {
      id: 'usr-bruno',
      name: 'Bruno Lima',
      username: 'bruno',
      email: 'bruno@nft.dev',
      bio: 'Música e fotografia on-chain.',
      ensName: '',
      walletNickname: 'Carteira do Bruno',
      avatarUrl: null,
      createdAt: '2026-02-02T09:30:00.000Z',
      salt: 's4lt-bruno',
      passwordHash: '82f7082cd052ffd6406466652f9e55f54e5d1ff8f9974fb3878891f7e414a009',
    },
  ]
}

export function buildWallets(): Record<string, Wallet[]> {
  return {
    'usr-ana': [
      {
        id: 'wal-ana-1',
        label: 'MetaMask principal',
        provider: 'metamask',
        address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        role: 'primary',
        networks: ['ethereum', 'polygon', 'solana'],
        displayName: 'Ana Colecionadora',
        profileName: 'Ana Coleções',
        email: 'ana@nft.dev',
        ensName: 'anacoleciona',
        referralCode: 'KURIOANA',
        secondaryAddress: '',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'wal-ana-2',
        label: 'Coinbase reserva',
        provider: 'coinbase',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        role: 'secondary',
        networks: ['ethereum'],
        displayName: 'Ana Colecionadora',
        profileName: 'Ana Reserva',
        email: 'ana@nft.dev',
        ensName: '',
        referralCode: '',
        secondaryAddress: '',
        updatedAt: '2026-03-02T10:00:00.000Z',
      },
    ],
    'usr-bruno': [],
  }
}

export interface CouponRule {
  code: string
  description: string
  kind: 'percent' | 'fixed' | 'free-fee'
  value: string
  minSubtotal?: string
  expiresAt: string
}

export const coupons: CouponRule[] = [
  { code: 'NFT10', description: '10% de desconto no subtotal', kind: 'percent', value: '10', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'WELCOME', description: '0.01 ETH de desconto', kind: 'fixed', value: '0.01', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'GASFREE', description: 'Taxa de rede grátis', kind: 'free-fee', value: '0', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'VIP20', description: '20% para pedidos acima de 1 ETH', kind: 'percent', value: '20', minSubtotal: '1', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'BLACK50', description: '50% Black Friday', kind: 'percent', value: '50', expiresAt: '2025-11-30T23:59:59.000Z' },
]
