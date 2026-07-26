/**
 * Découpage d'un texte en lignes, à largeur donnée.
 *
 * Aujourd'hui c'est le navigateur qui coupe les lignes, via `white-space`,
 * `word-break`, `overflow: hidden` et `text-overflow`.
 * Un export vectoriel doit produire exactement les mêmes lignes, sinon
 * l'aperçu et le PDF divergent — et deux implémentations de la même règle,
 * c'est précisément ce qui produit les bugs qu'on ne voit qu'à l'impression.
 *
 * Ce module est donc la seule autorité sur la question, et il est pur : la
 * mesure du texte lui est injectée. En production elle vient d'un canvas (les
 * métriques réelles de la police), dans les tests d'une fonction déterministe.
 */

/** Caractère d'ellipsis — un seul glyphe, comme le fait le navigateur. */
export const ELLIPSIS = '…'

/**
 * Faut-il marquer la coupe par une ellipsis ?
 *
 * `'auto'` reproduit ce que fait réellement le rendu actuel, et la distinction
 * n'est pas cosmétique : un bloc d'une ligne porte `text-overflow: ellipsis`,
 * donc le navigateur ajoute « … » ; un bloc multi-lignes n'a qu'un
 * `overflow: hidden`, donc le texte est coupé net. Ajouter l'ellipsis partout
 * ferait apparaître dans le PDF des points de suspension absents de l'aperçu.
 */
function veutEllipsis(mode, maxLines) {
  if (mode === true || mode === false) return mode
  return maxLines === 1
}

/**
 * @param {string} texte
 * @param {object} options
 * @param {number} options.maxWidth   largeur disponible (même unité que la mesure)
 * @param {number} options.maxLines   nombre de lignes autorisées (1 = pas de retour)
 * @param {(t: string) => number} options.measure  largeur d'une chaîne
 * @param {'auto'|boolean} [options.ellipsis]  marquage de la coupe, cf. veutEllipsis
 * @returns {{ lines: string[], truncated: boolean }}
 */
export function layoutText(texte, { maxWidth, maxLines = 1, measure, ellipsis = 'auto' }) {
  const contenu = String(texte ?? '')
  if (!contenu) return { lines: [], truncated: false }
  if (maxWidth <= 0 || maxLines < 1) return { lines: [], truncated: true }

  const avecEllipsis = veutEllipsis(ellipsis, maxLines)

  // Une seule ligne : pas de retour, on tronque comme `text-overflow: ellipsis`.
  if (maxLines === 1) {
    if (measure(contenu) <= maxWidth) return { lines: [contenu], truncated: false }
    const coupe = avecEllipsis
      ? tronquer(contenu, maxWidth, measure)
      : couperMot(contenu, maxWidth, measure).tete
    // Rien ne tient, pas même l'ellipsis : aucune ligne plutôt qu'une ligne
    // vide, qui occuperait une hauteur sans rien afficher.
    return { lines: coupe ? [coupe] : [], truncated: true }
  }

  const mots = contenu.split(/\s+/).filter(Boolean)
  const lignes = []
  let courante = ''

  for (let i = 0; i < mots.length; i++) {
    const mot = mots[i]
    const candidate = courante ? `${courante} ${mot}` : mot

    if (measure(candidate) <= maxWidth) {
      courante = candidate
      continue
    }

    // Le mot seul dépasse la largeur : on le coupe, comme `word-break: break-word`.
    if (!courante && measure(mot) > maxWidth) {
      const { tete, reste } = couperMot(mot, maxWidth, measure)
      lignes.push(tete)
      if (lignes.length === maxLines) {
        return finir(lignes, [reste, ...mots.slice(i + 1)].join(' '), maxWidth, measure, avecEllipsis)
      }
      mots[i] = reste
      i--            // on retraite le reste du mot sur la ligne suivante
      continue
    }

    lignes.push(courante)
    if (lignes.length === maxLines) {
      return finir(lignes, mots.slice(i).join(' '), maxWidth, measure, avecEllipsis)
    }
    courante = mot
  }

  if (courante) lignes.push(courante)
  return { lines: lignes, truncated: false }
}

/**
 * Le contenu déborde du nombre de lignes autorisé : on ajoute l'ellipsis à la
 * dernière ligne, comme le fait le navigateur, quitte à la raccourcir.
 */
function finir(lignes, reste, maxWidth, measure, avecEllipsis) {
  if (!reste) return { lines: lignes, truncated: false }
  if (!avecEllipsis) return { lines: lignes, truncated: true }
  const derniere = lignes[lignes.length - 1]
  lignes[lignes.length - 1] = tronquer(derniere + ELLIPSIS, maxWidth, measure, true)
  return { lines: lignes, truncated: true }
}

/**
 * Tronque une chaîne pour qu'elle tienne, ellipsis comprise.
 * `dejaSuffixee` indique que l'ellipsis est déjà dans la chaîne.
 */
function tronquer(texte, maxWidth, measure, dejaSuffixee = false) {
  const base = dejaSuffixee ? texte.slice(0, -ELLIPSIS.length) : texte
  // Recherche dichotomique : bien plus rapide qu'un retrait caractère par
  // caractère sur les longues désignations produit.
  let bas = 0
  let haut = base.length
  let meilleur = ''

  while (bas <= haut) {
    const milieu = (bas + haut) >> 1
    const essai = base.slice(0, milieu).trimEnd() + ELLIPSIS
    if (measure(essai) <= maxWidth) {
      meilleur = essai
      bas = milieu + 1
    } else {
      haut = milieu - 1
    }
  }

  // Même l'ellipsis seule ne tient pas : on rend une chaîne vide plutôt qu'un
  // glyphe qui déborderait de la vignette.
  if (!meilleur) return measure(ELLIPSIS) <= maxWidth ? ELLIPSIS : ''
  return meilleur
}

/** Coupe un mot trop long en une tête qui tient et un reste à reporter. */
function couperMot(mot, maxWidth, measure) {
  let bas = 1
  let haut = mot.length
  let coupe = 1

  while (bas <= haut) {
    const milieu = (bas + haut) >> 1
    if (measure(mot.slice(0, milieu)) <= maxWidth) {
      coupe = milieu
      bas = milieu + 1
    } else {
      haut = milieu - 1
    }
  }

  return { tete: mot.slice(0, coupe), reste: mot.slice(coupe) }
}
