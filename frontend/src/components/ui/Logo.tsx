const SRC = {
  black: '/SVG/logo-horizontal-black.svg',
  white: '/SVG/logo-horizontal-white.svg',
} as const

interface LogoProps {
  /** Which lockup to use — "black" (dark wordmark) for light backgrounds, "white" for dark ones. */
  variant?: keyof typeof SRC
  className?: string
}

export function Logo({ variant = 'black', className = 'h-7' }: LogoProps) {
  return <img src={SRC[variant]} alt="Marketplace" className={className} />
}
