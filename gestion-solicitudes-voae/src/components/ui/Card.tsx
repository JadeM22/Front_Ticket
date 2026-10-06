import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-azul-niebla bg-white p-5 shadow-sm transition-shadow duration-150 ${className}`}
      {...props}
    />
  )
}
