import { useState } from 'react'
import { useChat } from '../../store/chat'
import { GROUP_COLORS, GROUP_LOGOS, getGroupColor, getGroupLogo } from './groupLogos'
import { GroupAvatar } from './GroupAvatar'

/* Group customization panel — pick a name, a logo, and a color for the group.
 * Opens from the group header (admins) and applies instantly via the chat
 * store, persisted locally so the look survives reloads. */

export function GroupCustomize({
  conversationId,
  onClose,
}: {
  conversationId: string
  onClose: () => void
}) {
  const customizeGroup = useChat((s) => s.customizeGroup)
  const groupCustomMap = useChat((s) => s.groupCustom)
  const groupCustom = groupCustomMap[conversationId] ?? {}
  const summary = useChat((s) => s.summaries.find((x) => x.conversation.id === conversationId))

  const [name, setName] = useState(groupCustom.name ?? summary?.title ?? 'Group')
  const [logo, setLogo] = useState<string | null>(groupCustom.logo ?? null)
  const [color, setColor] = useState<string | null>(groupCustom.color ?? null)

  const swatch = getGroupColor(color)
  const logoNode = getGroupLogo(logo)

  const save = () => {
    customizeGroup(conversationId, {
      name: name.trim() ? name.trim() : undefined,
      logo: logo ?? undefined,
      color: color ?? undefined,
    })
    onClose()
  }

  return (
    <div className="sh-customize">
      <div className="sh-customize-head">
        <span className="sh-customize-title">Customize group</span>
        <button className="sh-icon" type="button" title="Close" onClick={onClose}>×</button>
      </div>

      <div className="sh-customize-preview">
        <GroupAvatar title={name || 'Group'} size={56} logo={logo} color={color} />
        <span className="sh-customize-preview-name">{name || 'Group'}</span>
      </div>

      <label className="sh-customize-label" htmlFor="sh-custom-name">Group name</label>
      <input
        id="sh-custom-name"
        className="sf-input"
        value={name}
        maxLength={40}
        placeholder="Group name"
        onChange={(e) => setName(e.target.value)}
        data-no-hotkeys
      />

      <p className="sh-customize-label">Logo</p>
      <div className="sh-logo-grid">
        {GROUP_LOGOS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`sh-logo-tile ${logo === l.id ? 'on' : ''}`}
            title={l.label}
            onClick={() => setLogo(l.id)}
          >
            <span style={{ color: swatch.from }}>{l.node}</span>
          </button>
        ))}
      </div>

      <p className="sh-customize-label">Color</p>
      <div className="sh-color-row">
        {GROUP_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`sh-color-dot ${color === c.id ? 'on' : ''}`}
            title={c.label}
            style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
            onClick={() => setColor(c.id)}
          />
        ))}
      </div>

      <div className="sh-create-actions">
        <button className="sh-pill ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="sh-pill" type="button" onClick={save}>Save</button>
      </div>
    </div>
  )
}
