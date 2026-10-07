import { Link } from '@tanstack/react-router'
import { Download, Mail, Phone, Tag } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { EmptyState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/use-session'
import { OrdersList } from '@/features/orders/orders-page'

function Section({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} | Kurio`
  }, [title])
  return (
    <section aria-labelledby="account-section-title" className="flex flex-col gap-6">
      <h2 id="account-section-title" className="text-[15px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function ActivityPage() {
  const session = useSession()
  return <Section title="Atividade">{session.status === 'authenticated' ? <OrdersList userId={session.user.id} /> : <Skeleton className="h-40" />}</Section>
}

export function OffersPage() {
  return (
    <Section title="Ofertas">
      <EmptyState
        icon={<Tag className="size-10 text-caption" aria-hidden="true" />}
        title="Nenhuma oferta por enquanto"
        message="Quando alguém fizer uma oferta por um NFT da sua coleção, ela aparece aqui."
      />
    </Section>
  )
}

export function DownloadsPage() {
  return (
    <Section title="Arquivos baixados">
      <EmptyState
        icon={<Download className="size-10 text-caption" aria-hidden="true" />}
        title="Nenhum arquivo baixado"
        message="As artes em alta resolução dos NFTs que você comprar ficam disponíveis para download aqui."
      />
    </Section>
  )
}

export function SupportPage() {
  return (
    <Section title="Suporte">
      <div className="flex flex-col gap-4 text-[15px] text-caption">
        <p>Fale com a equipe da Kurio sobre pedidos, carteiras ou sua conta.</p>
        <p className="flex items-center gap-2">
          <Mail className="size-4 text-highlight" aria-hidden="true" />
          <a href="mailto:contato@email.com" className="rounded-sm text-foreground outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
            contato@email.com
          </a>
        </p>
        <p className="flex items-center gap-2">
          <Phone className="size-4 text-highlight" aria-hidden="true" />
          <span className="text-foreground">+55 11 4002 8922</span>
        </p>
        <p>
          Antes de escrever, veja seus pedidos em{' '}
          <Link to="/account/activity" className="rounded-sm text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
            Atividade
          </Link>
          .
        </p>
      </div>
    </Section>
  )
}
