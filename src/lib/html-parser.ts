// Парсер HTML-файлов для извлечения структурированного текста
// Не использует AI — работает мгновенно и бесплатно.

/**
 * Извлекает читаемый текст из HTML-строки.
 * Сохраняет структуру (таблицы, списки, заголовки).
 */
export function extractTextFromHtml(html: string): string {
  // Убираем DOCTYPE и комментарии
  let clean = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Извлекаем <title>
  const titleMatch = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Заменяем блокирующие элементы на переводы строк
  clean = clean
    .replace(/<\/?(p|div|section|article|header|footer|main|nav|aside|tr|li|h[1-6]|br|hr)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(td|th)[^>]*>/gi, ' | ')
    .replace(/<\/tr[^>]*>/gi, '\n')

  // Удаляем <script> и <style> блоки целиком
  clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  clean = clean.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Удаляем все остальные теги
  clean = clean.replace(/<[^>]+>/g, '')

  // Декодируем HTML-entities (часто встречаются в таблицах)
  clean = decodeHtmlEntities(clean)

  // Нормализуем пробелы и переводы строк
  clean = clean
    .replace(/[ \t]+/g, ' ') // мультипробелы → один
    .replace(/\n[ \t]+/g, '\n') // убираем пробелы в начале строк
    .replace(/[ \t]+\n/g, '\n') // убираем пробелы в конце строк
    .replace(/\n{3,}/g, '\n\n') // мульти-переводы строк → два
    .trim()

  // Добавляем заголовок в начало, если есть
  if (title && !clean.startsWith(title)) {
    clean = `${title}\n\n${clean}`
  }

  return clean
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&laquo;': '«',
    '&raquo;': '»',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&le;': '≤',
    '&ge;': '≥',
    '&ne;': '≠',
    '&asymp;': '≈',
    '&micro;': 'µ',
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ',
    '&agrave;': 'à',
    '&egrave;': 'è',
    '&igrave;': 'ì',
    '&ograve;': 'ò',
    '&ugrave;': 'ù',
    '&acirc;': 'â',
    '&ecirc;': 'ê',
    '&icirc;': 'î',
    '&ocirc;': 'ô',
    '&ucirc;': 'û',
    '&auml;': 'ä',
    '&euml;': 'ë',
    '&iuml;': 'ï',
    '&ouml;': 'ö',
    '&uuml;': 'ü',
    '&yuml;': 'ÿ',
    '&Auml;': 'Ä',
    '&Euml;': 'Ë',
    '&Iuml;': 'Ï',
    '&Ouml;': 'Ö',
    '&Uuml;': 'Ü',
    '&ccedil;': 'ç',
    '&Ccedil;': 'Ç',
    '&sigma;': 'σ',
    '&alpha;': 'α',
    '&beta;': 'β',
    '&gamma;': 'γ',
    '&delta;': 'δ',
    '&pi;': 'π',
    '&phi;': 'φ',
    '&omega;': 'ω',
    '&lambda;': 'λ',
    '&mu;': 'µ',
    '&rarr;': '→',
    '&larr;': '←',
    '&uarr;': '↑',
    '&darr;': '↓',
    '&harr;': '↔',
    '&infin;': '∞',
    '&radic;': '√',
    '&sum;': '∑',
    '&int;': '∫',
    '&part;': '∂',
    '&nbsp': ' ',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char)
  }

  // Декодируем числовые entities (&#123;, &#x7B;)
  result = result.replace(/&#(\d+);/g, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 10))
    } catch {
      return ''
    }
  })
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 16))
    } catch {
      return ''
    }
  })

  return result
}

/**
 * Проверяет, является ли содержимое HTML-документом.
 */
export function isHtml(content: string): boolean {
  const lower = content.trim().toLowerCase()
  return (
    lower.startsWith('<!doctype html') ||
    lower.startsWith('<html') ||
    (lower.includes('<head') && lower.includes('<body')) ||
    (lower.includes('<table') && lower.includes('<tr')) // таблица часто в HTML
  )
}

/**
 * Формирует читаемое описание извлечённого текста — для отображения в UI.
 * Извлекает ключевые блоки (заголовок, дату, показатели).
 */
export function formatExtractedHtmlText(text: string, fileName: string): string {
  const lines = text.split('\n').filter((l) => l.trim())

  // Форматируем красиво — убираем строки с только спецсимволами
  const cleanLines = lines
    .map((l) => l.trim())
    .filter((l) => l && !/^[|\-\s–]+$/.test(l)) // убираем строки-разделители таблиц

  return `📄 Источник: ${fileName} (HTML)\n\n${cleanLines.join('\n')}`
}
