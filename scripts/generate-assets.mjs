// Gera as artes SVG determinísticas usadas pelos fixtures (NFTs e avatares).
// Substituem os assets do Figma enquanto o arquivo não está acessível; ver docs/DESIGN.md.
import { mkdirSync, writeFileSync } from 'node:fs'

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const palettes = [
  ['#A259FF', '#377DFF', '#FF6AD5', '#1B1B3A'],
  ['#FF8A00', '#FF3D71', '#FFD166', '#2B1B3A'],
  ['#00C2FF', '#00FFA3', '#7B61FF', '#0D1B2A'],
  ['#F72585', '#7209B7', '#4CC9F0', '#10002B'],
  ['#FFBE0B', '#FB5607', '#FF006E', '#3A0CA3'],
  ['#06D6A0', '#118AB2', '#FFD166', '#073B4C'],
  ['#E0AAFF', '#9D4EDD', '#5A189A', '#240046'],
  ['#80FFDB', '#5390D9', '#7400B8', '#14213D'],
]
function art(seed, variant) {
  const r = rng(seed * 31 + variant * 7)
  const p = palettes[seed % palettes.length]
  const rot = variant === 2 ? 180 : 0
  const shapes = []
  const kind = seed % 4
  for (let i = 0; i < 7; i++) {
    const x = Math.round(r() * 400), y = Math.round(r() * 400), s = Math.round(40 + r() * 160)
    const c = p[i % 3]
    if (kind === 0) shapes.push(`<circle cx="${x}" cy="${y}" r="${s / 1.5}" fill="${c}" opacity="${(0.45 + r() * 0.5).toFixed(2)}"/>`)
    else if (kind === 1) shapes.push(`<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${Math.round(s / 5)}" fill="${c}" opacity="${(0.5 + r() * 0.4).toFixed(2)}" transform="rotate(${Math.round(r() * 90)} ${x} ${y})"/>`)
    else if (kind === 2) shapes.push(`<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s / 3}" fill="${c}" opacity="${(0.4 + r() * 0.5).toFixed(2)}" transform="rotate(${Math.round(r() * 180)} ${x} ${y})"/>`)
    else shapes.push(`<path d="M${x} ${y} l${s} ${Math.round(s / 2)} l-${Math.round(s / 2)} ${s} z" fill="${c}" opacity="${(0.5 + r() * 0.45).toFixed(2)}"/>`)
  }
  const ring = `<circle cx="200" cy="200" r="${90 + Math.round(r() * 40)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${2 + Math.round(r() * 6)}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[3]}"/><stop offset="1" stop-color="${variant === 1 ? p[1] : p[0]}" stop-opacity=".55"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="${variant === 1 ? 2 : 10}"/></filter></defs><rect width="400" height="400" fill="url(#g)"/><g filter="url(#b)" transform="rotate(${rot} 200 200)">${shapes.join('')}</g>${ring}</svg>`
}
function avatar(seed, initials) {
  const p = palettes[seed % palettes.length]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="120" height="120" fill="url(#a)"/><circle cx="60" cy="48" r="22" fill="#fff" fill-opacity=".85"/><path d="M20 112c6-26 24-38 40-38s34 12 40 38z" fill="#fff" fill-opacity=".85"/>${initials ? `<text x="60" y="114" font-family="monospace" font-size="1" fill="transparent">${initials}</text>` : ''}</svg>`
}
mkdirSync('public/nfts', { recursive: true })
mkdirSync('public/avatars', { recursive: true })
for (let i = 1; i <= 60; i++) {
  const n = String(i).padStart(2, '0')
  writeFileSync(`public/nfts/nft-${n}.svg`, art(i, 0))
  writeFileSync(`public/nfts/nft-${n}-b.svg`, art(i, 1))
  writeFileSync(`public/nfts/nft-${n}-c.svg`, art(i, 2))
}
for (let i = 1; i <= 8; i++) writeFileSync(`public/avatars/creator-${i}.svg`, avatar(i + 3))
writeFileSync('public/avatars/user-ana.svg', avatar(2))
console.log('assets gerados')
