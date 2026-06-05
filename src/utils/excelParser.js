import * as XLSX from 'xlsx'
import Papa from 'papaparse'

/**
 * Parse an Excel or CSV file.
 * Returns { columns: string[], rows: object[], sheetNames: string[], rawWorkbook? }
 */
export async function parseFile(file, options = {}) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'csv' || ext === 'tsv') {
    return parseCsv(file, options)
  } else if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
    return parseExcel(file, options)
  } else {
    throw new Error(`Format non supporté : .${ext}`)
  }
}

function parseCsv(file, options) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: options.delimiter ?? '',
      complete: (results) => {
        const columns = results.meta.fields ?? []
        resolve({ columns, rows: results.data, sheetNames: [file.name] })
      },
      error: (err) => reject(err),
    })
  })
}

async function parseExcel(file, options) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: false, cellHTML: false })

  const sheetNames = workbook.SheetNames
  const sheetName = options.sheetName ?? sheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  })

  // Detect columns from first row (sheet headers)
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  const columns = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })]
    if (cell && cell.v != null) columns.push(String(cell.v))
  }

  return { columns, rows: rawRows, sheetNames, workbook }
}
