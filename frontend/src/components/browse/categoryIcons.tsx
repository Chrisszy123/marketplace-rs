import type { SVGProps } from 'react'

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element

const iconProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const VehiclesIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M3 13l1.6-4.8A2 2 0 0 1 6.5 6.8h11a2 2 0 0 1 1.9 1.4L21 13" />
    <rect x="3" y="13" width="18" height="5" rx="1.5" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="16.5" cy="18.5" r="1.5" />
  </svg>
)

const PropertyIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M4 11l8-6 8 6" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
)

const ElectronicsIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <rect x="4" y="4" width="16" height="11" rx="1.5" />
    <path d="M9 19h6" />
    <path d="M12 15v4" />
  </svg>
)

const FashionIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M9 4l3 2 3-2 3 3-2.5 2.5V20H8.5V9.5L6 7z" />
  </svg>
)

const HomeFurnitureIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M4 12v7h16v-7" />
    <path d="M4 12a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 12" />
    <path d="M6 9.5V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5v3" />
    <path d="M6 19v-2M18 19v-2" />
  </svg>
)

const JobsIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
    <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
    <path d="M3.5 12.5h17" />
  </svg>
)

const ServicesIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M14.7 6.3a3 3 0 0 1-3.9 3.9L5 16v3h3l5.8-5.8a3 3 0 0 1 3.9-3.9L21 6l-3-3z" />
  </svg>
)

const AgricultureIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M12 21c0-5 2-7 6-9-4 0-7 2-8 6" />
    <path d="M12 21c0-6-2-9-7-11 5 0 8 3 9 8" />
    <path d="M12 21V13" />
  </svg>
)

const BabyKidsIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M6 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
    <path d="M9.5 7.5c0-1 .8-2 2.5-2s2.5 1 2.5 2" />
  </svg>
)

const OthersIcon: IconComponent = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M20.5 12a8.5 8.5 0 1 1-8.5-8.5" />
    <path d="M13 3.5V9l4 2" />
  </svg>
)

export const categoryIcons: Record<string, IconComponent> = {
  vehicles: VehiclesIcon,
  property: PropertyIcon,
  electronics: ElectronicsIcon,
  'fashion-beauty': FashionIcon,
  'home-furniture': HomeFurnitureIcon,
  jobs: JobsIcon,
  services: ServicesIcon,
  agriculture: AgricultureIcon,
  'baby-kids': BabyKidsIcon,
  others: OthersIcon,
}

export function getCategoryIcon(slug: string): IconComponent {
  return categoryIcons[slug] ?? OthersIcon
}
