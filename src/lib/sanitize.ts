import DOMPurify from 'dompurify'

/**
 * Centralized HTML sanitization utility.
 * All user-generated content should go through these functions.
 */

/** Sanitize HTML for safe rendering via dangerouslySetInnerHTML */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'em', 'strong', 's', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'hr', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'mark', 'sub', 'sup',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'class', 'style', 'target', 'rel',
      'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
  })
}

/** Escape HTML entities for safe insertion into HTML strings */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Sanitize a URL to prevent javascript: and data: URI attacks */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    // Strip HTML entities and whitespace so encoded schemes
    // (e.g. java&#x73;cript:, %6a%61vascript:) can't slip past.
    const cleaned = trimmed
      .replace(/&#x?[0-9a-f]+;|&#[0-9]+;/gi, '')
      .replace(/&[a-z]+;/gi, '')
      .replace(/\s+/g, '')
      .toLowerCase()
    const lower = cleaned.includes('%')
      ? (() => { try { return decodeURIComponent(cleaned) } catch { return cleaned } })()
      : cleaned
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return ''
    if (lower.startsWith('data:')) {
      // Only inline images; block everything else (html, text, svg-with-handlers).
      if (!/^data:image\/(png|gif|jpe?g|webp|svg\+xml);/i.test(lower)) return ''
      if (lower.includes('<svg') && /<svg[\s>].*(onload|onerror|onclick|onmouseover|script)/i.test(lower)) return ''
    }
  } catch {
    return ''
  }
  return trimmed
}

/** Sanitize text for display (strip all HTML) */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}