import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'outline' | 'ghost' | 'gold'

const variants: Record<Variant, string> = {
  primary:
    'bg-lake-900 text-cream hover:bg-lake-700 disabled:bg-stone-soft/40 disabled:cursor-not-allowed',
  outline:
    'border border-lake-900/30 text-lake-900 hover:border-lake-900 hover:bg-lake-50',
  ghost: 'text-lake-900 hover:bg-lake-50',
  gold: 'bg-gold text-white hover:bg-gold-light',
}

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-200 cursor-pointer'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${baseClass} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

interface LinkButtonProps {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
}

export function LinkButton({ to, variant = 'primary', className = '', children }: LinkButtonProps) {
  return (
    <Link to={to} className={`${baseClass} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
