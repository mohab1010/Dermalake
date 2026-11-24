interface QuantityPickerProps {
  value: number
  max: number
  onChange: (value: number) => void
  small?: boolean
}

export function QuantityPicker({ value, max, onChange, small = false }: QuantityPickerProps) {
  const btn = `flex items-center justify-center text-lake-900 transition-colors hover:bg-lake-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
    small ? 'h-8 w-8 text-base' : 'h-11 w-11 text-lg'
  }`
  return (
    <div
      className={`inline-flex items-center rounded-full border border-lake-900/20 ${small ? 'h-8' : 'h-11'}`}
      dir="ltr"
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label="decrease">
        −
      </button>
      <span className={`text-center tabular-nums ${small ? 'w-7 text-sm' : 'w-9'}`}>{value}</span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
