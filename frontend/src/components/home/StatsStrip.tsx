const STATS = [
  { value: '18,400+', label: 'Active listings' },
  { value: '10', label: 'Categories covered' },
  { value: '62,000+', label: 'Buyers & sellers' },
  { value: '1,200+', label: 'New listings this week' },
]

export function StatsStrip() {
  return (
    <section className="bg-brand-cream px-4 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-semibold text-brand-green sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm text-brand-dark-green">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
