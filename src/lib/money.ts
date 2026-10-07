import Big from 'big.js'

Big.DP = 18
Big.RM = Big.roundHalfUp

export type Eth = string

export const ZERO: Eth = '0'

export function toBig(value: Eth | number) {
  return new Big(value)
}

export function normalize(value: Big): Eth {
  const fixed = value.round(18, Big.roundHalfUp).toFixed(18)
  return fixed.replace(/\.?0+$/, '') || '0'
}

export const add = (...values: Eth[]): Eth => normalize(values.reduce((acc, v) => acc.plus(v), new Big(0)))
export const sub = (a: Eth, b: Eth): Eth => normalize(new Big(a).minus(b))
export const mul = (a: Eth, qty: number | Eth): Eth => normalize(new Big(a).times(qty))
export const pct = (a: Eth, percent: number): Eth => normalize(new Big(a).times(percent).div(100))
export const max = (a: Eth, b: Eth): Eth => (new Big(a).gte(b) ? a : b)
export const min = (a: Eth, b: Eth): Eth => (new Big(a).lte(b) ? a : b)
export const cmp = (a: Eth, b: Eth) => new Big(a).cmp(b)
export const eq = (a: Eth, b: Eth) => new Big(a).eq(b)
export const isPositive = (a: Eth) => new Big(a).gt(0)

export function isEth(value: string) {
  return /^\d+(\.\d{1,18})?$/.test(value)
}

export function formatEth(value: Eth, { maxDecimals = 4, symbol = true } = {}): string {
  const b = new Big(value)
  if (b.gt(0) && b.lt(new Big(1).div(new Big(10).pow(maxDecimals)))) {
    return `< ${new Big(1).div(new Big(10).pow(maxDecimals)).toFixed(maxDecimals)}${symbol ? ' ETH' : ''}`
  }
  let text = b.round(maxDecimals, Big.roundHalfUp).toFixed(maxDecimals).replace(/0+$/, '')
  if (text.endsWith('.')) text += '0'
  return symbol ? `${text} ETH` : text
}

export function formatEthFull(value: Eth) {
  return `${normalize(new Big(value))} ETH`
}
