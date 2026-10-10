import type { SVGProps } from 'react'

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { size?: number }

/** Stroke icon on a 24×24 grid, matching the design's line weight. */
function Icon({ size = 20, strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  )
}

export function MoonIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    </Icon>
  )
}

export function SunIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </Icon>
  )
}

export function BagIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Icon>
  )
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  )
}

export function PlusIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.75} {...p}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function MinusIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.75} {...p}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function CheckIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.75} {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

export function FilterIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </Icon>
  )
}

export function SearchIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Icon>
  )
}

export function TruckIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <path d="M2 6h11v10H2zM13 9h5l4 4v3h-9z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </Icon>
  )
}

export function ReturnIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <path d="M4 9h11a5 5 0 0 1 0 10H8" />
      <path d="M8 5L4 9l4 4" />
    </Icon>
  )
}

export function CardIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19M6.5 15h4" />
    </Icon>
  )
}

export function ShieldIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </Icon>
  )
}

export function HeartIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Icon fill={filled ? 'currentColor' : 'none'} {...p}>
      <path d="M12 20s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.7C19.5 15.6 12 20 12 20z" />
    </Icon>
  )
}

export function MenuIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Icon>
  )
}

export function CloseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function ClockIcon(p: IconProps) {
  return (
    <Icon strokeWidth={1.5} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  )
}

export function CornerDownLeftIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M19 5v6a3 3 0 0 1-3 3H6M10 10l-4 4 4 4" />
    </Icon>
  )
}

export function StarIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" />
    </svg>
  )
}

export function UserIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Icon>
  )
}

export function LogOutIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h9" />
    </Icon>
  )
}
