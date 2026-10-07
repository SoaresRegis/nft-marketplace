// Auditoria Lighthouse: 3 medições por página e perfil, mediana por categoria.
// Uso: pnpm build:demo && pnpm preview (em outro terminal) && pnpm lighthouse
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { PAGES, PROFILES, RUNS, TARGETS } from '../lighthouse/config.mjs'

const BASE = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const CHROME = process.env.CHROME_PATH ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync)
const OUT = process.env.LH_OUT ?? 'lighthouse/reports'

const only = (name, list) => !list || list.split(',').includes(name)
mkdirSync(OUT, { recursive: true })

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const results = []
for (const [profile, config] of Object.entries(PROFILES)) {
  if (!only(profile, process.env.LH_PROFILES)) continue
  for (const page of PAGES) {
    if (!only(page.name, process.env.LH_PAGES)) continue
    const runs = []
    for (let i = 1; i <= RUNS; i++) {
      // perfil novo a cada execução: carga fria, inclusive do service worker do MSW
      const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
      try {
        const result = await lighthouse(`${BASE}${page.path}`, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config)
        const lhr = result.lhr
        const [html, json] = result.report
        const base = `${OUT}/${page.name}-${profile}-run${i}`
        writeFileSync(`${base}.html`, html)
        writeFileSync(`${base}.json`, json)
        const run = {
          scores: Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)])),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          fcp: lhr.audits['first-contentful-paint'].numericValue,
        }
        runs.push(run)
        console.log(`${page.name} ${profile} #${i}`, run.scores, `LCP ${Math.round(run.lcp)}ms CLS ${run.cls.toFixed(3)} TBT ${Math.round(run.tbt)}ms`)
        if (i === 1) results.lighthouseVersion = lhr.lighthouseVersion
        if (i === 1) results.userAgent = lhr.environment.hostUserAgent
      } finally {
        await chrome.kill()
      }
    }
    const categories = Object.keys(runs[0].scores)
    results.push({
      page: page.name,
      path: page.path,
      profile,
      median: Object.fromEntries(categories.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
      lcpMs: Math.round(median(runs.map((r) => r.lcp))),
      cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
      tbtMs: Math.round(median(runs.map((r) => r.tbt))),
      fcpMs: Math.round(median(runs.map((r) => r.fcp))),
      runs,
    })
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  runsPerPage: RUNS,
  targets: TARGETS,
  environment: {
    lighthouse: results.lighthouseVersion,
    chrome: results.userAgent,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpus: `${os.cpus().length}x ${os.cpus()[0]?.model}`,
    memoryGb: Math.round(os.totalmem() / 1e9),
    build: 'vite build --mode demo (mocks ativos), servido por vite preview',
    deps: { vite: pkg.devDependencies.vite, react: pkg.dependencies.react, msw: pkg.devDependencies.msw },
  },
  // eslint-disable-next-line no-unused-vars -- remove as execuções brutas do resumo
  results: results.map(({ runs, ...r }) => r),
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ...summary, results }, null, 2))

const rows = summary.results.map(
  (r) =>
    `| ${r.page} | ${r.profile} | ${r.median.performance} | ${r.median.accessibility} | ${r.median['best-practices']} | ${r.median.seo} | ${r.lcpMs} ms | ${r.cls} | ${r.tbtMs} ms |`,
)
const md = [
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n')
writeFileSync(`${OUT}/summary.md`, `${md}\n`)
console.log(`\n${md}`)
