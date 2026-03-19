import classes from './MethodBadge.module.css'

type MethodBadgeProps = {
  method: string
  inverted?: boolean
}

export function MethodBadge({ method, inverted }: MethodBadgeProps) {
  const colorClass = classes[method as keyof typeof classes]
  return (
    <span className={`${classes.badge}${colorClass ? ` ${colorClass}` : ''}${inverted ? ` ${classes.inverted}` : ''}`}>
      {method}
    </span>
  )
}
