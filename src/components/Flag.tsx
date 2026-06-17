import { getCountry } from '../lib/countries'

// Country flag via the flag-icons CSS sprite (`fi fi-<cc>`), which renders
// reliably on every OS — unlike emoji flags, which Windows/Chrome don't draw.
// Falls back to the emoji flag if the code is unknown.
export function Flag({
  code,
  className = '',
  title,
}: {
  code: string | null | undefined
  className?: string
  title?: string
}) {
  const country = getCountry(code)
  if (!country) return null
  return (
    <span
      className={`fi fi-${country.code.toLowerCase()} fl-flag ${className}`.trim()}
      title={title ?? country.name}
      role="img"
      aria-label={country.name}
    />
  )
}
