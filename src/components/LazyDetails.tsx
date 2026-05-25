import { useState, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

type LazyDetailsProps = {
  children: ReactNode | ((open: boolean) => ReactNode)
  className?: string
  id?: string
  summary: ReactNode
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void
}

export function LazyDetails({
  children,
  className,
  id,
  summary,
  onToggle,
}: LazyDetailsProps) {
  const [open, setOpen] = useState(false)
  const toggleOpen = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setOpen((current) => !current)
  }

  return (
    <details
      className={className}
      id={id}
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        onToggle?.(event)
      }}
    >
      <summary onClick={toggleOpen}>{summary}</summary>
      {open ? renderLazyContent(children, open) : null}
    </details>
  )
}

function renderLazyContent(children: LazyDetailsProps['children'], open: boolean) {
  return typeof children === 'function' ? children(open) : children
}
