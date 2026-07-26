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
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:text/html') ||
    trimmed.startsWith('vbscript:')
  ) {
    return ''
  }
  return url
}

/** Sanitize text for display (strip all HTML) */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}