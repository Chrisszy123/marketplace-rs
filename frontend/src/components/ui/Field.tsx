import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-brand-dark/15 bg-white px-3.5 py-2.5 text-body text-brand-dark outline-none transition placeholder:text-brand-dark/35 focus:border-brand-green focus:ring-2 focus:ring-brand-green/15'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, id, className = '', ...rest }: TextFieldProps) {
  return (
    <label htmlFor={id} className={`block text-body-sm font-medium text-brand-dark ${className}`}>
      {label}
      <input id={id} className={inputClass} {...rest} />
      {hint && <span className="mt-1 block text-caption font-normal text-brand-dark/50">{hint}</span>}
    </label>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function TextAreaField({ label, hint, id, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <label htmlFor={id} className={`block text-body-sm font-medium text-brand-dark ${className}`}>
      {label}
      <textarea id={id} className={inputClass} {...rest} />
      {hint && <span className="mt-1 block text-caption font-normal text-brand-dark/50">{hint}</span>}
    </label>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
}

export function SelectField({ label, hint, id, className = '', children, ...rest }: SelectFieldProps) {
  return (
    <label htmlFor={id} className={`block text-body-sm font-medium text-brand-dark ${className}`}>
      {label}
      <select id={id} className={`${inputClass} appearance-none`} {...rest}>
        {children}
      </select>
      {hint && <span className="mt-1 block text-caption font-normal text-brand-dark/50">{hint}</span>}
    </label>
  )
}
