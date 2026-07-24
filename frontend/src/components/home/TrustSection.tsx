const POINTS = [
  {
    title: 'See who you’re dealing with',
    body: 'Profiles show ratings from past deals and a verified badge for phone-confirmed sellers, so you can judge who to trust before you message.',
  },
  {
    title: 'Meet safely',
    body: 'Chat in-app first, meet in a public place for handovers, and inspect goods before you pay. Simple habits that avoid most bad deals.',
  },
  {
    title: 'We’re the introduction, not the middleman',
    body: 'Marketplace doesn’t hold funds or handle delivery — you agree the price and payment method directly with the other person, same as any classifieds trade.',
  },
]

export function TrustSection() {
  return (
    <section className="bg-brand-forest px-4 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center text-2xl font-semibold sm:text-3xl">
          Trade with confidence
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.title}>
              <h3 className="mb-2 font-medium text-brand-boosted">{point.title}</h3>
              <p className="text-sm text-white/70">{point.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
