/**
 * Migrations du format de projet.
 *
 * Version 3 — les coordonnées des blocs de vignette passent en millimètres.
 *
 * Elles étaient stockées en pixels CSS à 96 dpi alors que l'interface les
 * annonçait en millimètres : saisir 10 plaçait le bloc à 2,64 mm. L'écart
 * passait inaperçu à l'écran mais rendait tout positionnement précis
 * impossible, ce qui n'est pas tenable pour de l'impression.
 *
 * Les blocs d'en-tête et de pied étaient déjà en millimètres : ils ne sont
 * pas touchés.
 */

/** Version courante du format de projet, écrite par exportProject. */
export const PROJECT_VERSION = 3

const MM_PAR_PX = 25.4 / 96

/** Coordonnées converties : ce sont les seules à changer d'unité. */
const CHAMPS_GEOMETRIQUES = ['x', 'y', 'width', 'height']

/** Convertit un bloc de vignette des pixels CSS vers les millimètres. */
function blocEnMm(block) {
  const out = { ...block }
  for (const champ of CHAMPS_GEOMETRIQUES) {
    if (typeof out[champ] === 'number') out[champ] = out[champ] * MM_PAR_PX
  }
  return out
}

/**
 * Applique les migrations nécessaires à un projet, d'après sa version.
 * Sans effet sur un projet déjà à jour : la fonction est idempotente, ce qui
 * compte parce qu'elle est appelée à l'import comme au réhydratage.
 *
 * @param {object} projet  contenu de projet ({ version, vignetteBlocks, … })
 * @returns {object} projet à la version courante
 */
export function migrateProject(projet) {
  if (!projet || typeof projet !== 'object') return projet
  const version = Number(projet.version ?? 0)
  if (version >= PROJECT_VERSION) return projet

  const out = { ...projet, version: PROJECT_VERSION }
  if (Array.isArray(projet.vignetteBlocks)) {
    out.vignetteBlocks = projet.vignetteBlocks.map(blocEnMm)
  }
  return out
}
