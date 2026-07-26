/**
 * Chargement des images pour le PDF.
 *
 * Un PDF n'accepte que le JPEG et le PNG. Or les sources d'un catalogue sont
 * variées : photos produit en JPEG, logos et badges souvent en SVG ou WebP.
 * Tout ce qui n'est pas directement embarquable est donc rasterisé via un
 * canvas — un SVG reste net car on le rend à haute résolution avant de le
 * convertir.
 */

/** Résolution de rasterisation : au-delà, le poids ne se justifie plus. */
const TAILLE_MAX_RASTER = 1600

const OCTETS_MAGIQUES = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
}

/** Type réel d'après les premiers octets, plus fiable que l'en-tête HTTP. */
export function detecterType(octets) {
  const commence = (signature) => signature.every((o, i) => octets[i] === o)
  if (commence(OCTETS_MAGIQUES.png)) return 'image/png'
  if (commence(OCTETS_MAGIQUES.jpeg)) return 'image/jpeg'
  return null
}

/**
 * Charge une image et renvoie des octets embarquables dans un PDF.
 * @returns {Promise<{bytes: Uint8Array, type: string}|null>}
 */
export async function loadImageBytes(src) {
  if (!src) return null

  let octets
  try {
    const reponse = await fetch(src)
    if (!reponse.ok) return null
    octets = new Uint8Array(await reponse.arrayBuffer())
  } catch {
    return null
  }

  const type = detecterType(octets)
  if (type) return { bytes: octets, type }

  // Format non embarquable (SVG, WebP, AVIF…) : on le rasterise.
  return rasteriser(src)
}

/** Rend une image dans un canvas et renvoie un PNG. */
function rasteriser(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const naturelle = Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
      // Un SVG déclare souvent une taille minuscule : on l'agrandit pour
      // qu'il reste net à l'impression, sans dépasser le plafond.
      const facteur = Math.min(TAILLE_MAX_RASTER / naturelle, 8)
      const w = Math.max(1, Math.round((img.naturalWidth || 1) * facteur))
      const h = Math.max(1, Math.round((img.naturalHeight || 1) * facteur))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(null)
        resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), type: 'image/png' })
      }, 'image/png')
    }

    img.onerror = () => resolve(null)
    img.src = src
  })
}
