import type { LucideIcon } from 'lucide-react'
import type { AppCopy } from '../lib/appCopy'

export type ConfigRailItem<Target extends string = string> = {
  icon: LucideIcon
  label: string
  target: Target
}

type ConfigRailProps<Target extends string> = {
  copy: AppCopy
  items: ConfigRailItem<Target>[]
  onSelect: (target: Target) => void
}

export function ConfigRail<Target extends string>({
  copy,
  items,
  onSelect,
}: ConfigRailProps<Target>) {
  return (
    <nav className="config-rail" aria-label={copy.configurationPanel}>
      {items.map(({ icon: Icon, label, target }) => (
        <button
          type="button"
          className="config-rail-button"
          key={target}
          aria-label={copy.openConfigurationSection(label)}
          title={label}
          onClick={() => onSelect(target)}
        >
          <Icon size={18} />
        </button>
      ))}
    </nav>
  )
}
