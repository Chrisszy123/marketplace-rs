interface PriceRangeSliderProps {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
}

export function PriceRangeSlider({ min, max, step, valueMin, valueMax, onChange }: PriceRangeSliderProps) {
  const minPercent = ((valueMin - min) / (max - min)) * 100
  const maxPercent = ((valueMax - min) / (max - min)) * 100

  return (
    <div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-brand-dark/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-green"
          style={{ left: `${minPercent}%`, width: `${Math.max(maxPercent - minPercent, 0)}%` }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax - step), valueMax)}
          className="range-input pointer-events-none absolute inset-0 h-5 w-full"
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + step))}
          className="range-input pointer-events-none absolute inset-0 h-5 w-full"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-caption text-brand-dark/60">
        <span>₦{valueMin.toLocaleString()}</span>
        <span>₦{valueMax.toLocaleString()}{valueMax === max ? '+' : ''}</span>
      </div>
    </div>
  )
}
