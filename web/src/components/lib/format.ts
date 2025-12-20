export const fmt = {
  rub: (n: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(n || 0),
  cny: (n: number) =>
    new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0),
  num: (n: number, digits = 2) =>
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n || 0),
  pct: (n: number) => `${Math.round((n || 0) * 100)}%`,
};