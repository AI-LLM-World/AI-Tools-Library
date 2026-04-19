import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'primary', className = '', ...rest },
  ref
) {
  const cls = `gstack-btn gstack-btn--${variant} ${className}`.trim()
  return (
    <button {...rest} ref={ref} className={cls}>
      {children}
    </button>
  )
})

export default Button
