import { useEffect } from 'react'
import useCatalogStore from '../store/catalogStore'

/**
 * Injects @font-face CSS rules for all custom fonts stored in the catalogue.
 * Mount once at App root level.
 *
 * Also exports `buildFontFaceCSS` so the ExportModal can inject the same
 * rules into the html2canvas cloned document.
 */

export function buildFontFaceCSS(customFonts) {
  return customFonts.map(f => `
@font-face {
  font-family: '${f.name}';
  src: url('${f.src}') format('${f.format}');
  font-weight: 100 900;
  font-style: normal;
}
  `.trim()).join('\n')
}

const STYLE_ID = 'catalogue-custom-fonts'

export default function FontLoader() {
  const customFonts = useCatalogStore(s => s.customFonts)

  useEffect(() => {
    let styleEl = document.getElementById(STYLE_ID)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = buildFontFaceCSS(customFonts)
  }, [customFonts])

  return null
}
