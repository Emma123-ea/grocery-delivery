export function formatPrice(pesewas) {
  const cedis = (pesewas / 100).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `GH₵ ${cedis}`
}