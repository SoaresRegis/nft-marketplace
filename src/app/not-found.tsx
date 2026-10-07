import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="container-page flex flex-col items-center gap-6 py-24 text-center" aria-labelledby="nf-title">
      <p className="font-mono text-7xl font-bold text-primary">404</p>
      <h1 id="nf-title" className="text-3xl font-semibold md:text-5xl">Página não encontrada</h1>
      <p className="max-w-md text-caption">O endereço acessado não existe. Verifique o link ou volte para o marketplace.</p>
      <Button asChild size="default">
        <Link to="/">Ir para o marketplace</Link>
      </Button>
    </section>
  )
}
