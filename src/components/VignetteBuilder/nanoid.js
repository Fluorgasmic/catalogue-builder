// Lightweight nanoid-like unique ID generator (no dependency needed)
export const nanoid = (size = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map(b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62])
    .join('')
