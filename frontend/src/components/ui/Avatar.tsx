const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-body-sm',
  md: 'h-12 w-12 text-h3',
  lg: 'h-20 w-20 text-h1',
} as const

export type AvatarSize = keyof typeof SIZE_CLASSES

interface AvatarProps {
  name: string
  url?: string | null
  size?: AvatarSize
  className?: string
}

export function Avatar({ name, url, size = 'md', className = '' }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-green/15 font-semibold text-brand-dark-green ${SIZE_CLASSES[size]} ${className}`}
    >
      {initial}
    </div>
  )
}
