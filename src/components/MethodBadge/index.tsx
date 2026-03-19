import classes from './MethodBadge.module.css'

type MethodBadgeProps = {
  method: string
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const colorClass = classes[method as keyof typeof classes]
  return (
    <span className={`${classes.badge}${colorClass ? ` ${colorClass}` : ''}`}>
      {method}
    </span>
  )
}
