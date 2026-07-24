interface Step {
  title: string
  body: string
}

const BUYER_STEPS: Step[] = [
  { title: 'Search', body: 'Filter by category, location and price to find what you need nearby.' },
  { title: 'Message', body: 'Ask questions or make an offer straight in the app — no phone number needed upfront.' },
  { title: 'Meet up', body: 'Agree on a time, place and price with the seller, and sort out payment between yourselves.' },
]

const SELLER_STEPS: Step[] = [
  { title: 'List in minutes', body: 'Add photos, a price and a location. Free listings stay live for 30 days.' },
  { title: 'Get discovered', body: 'Buyers searching your category and area see your listing in results.' },
  { title: 'Get paid, subscription optional', body: 'Deal directly with the buyer. Subscribe any time for top placement and more active listings.' },
]

function StepTrack({ heading, steps }: { heading: string; steps: Step[] }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <h3 className="mb-6 text-lg font-semibold text-brand-dark-green">{heading}</h3>
      <ol className="space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-sm font-semibold text-brand-green">
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-brand-dark">{step.title}</p>
              <p className="text-sm text-brand-dark/70">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section className="bg-brand-bg px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-semibold text-brand-dark-green sm:text-3xl">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <StepTrack heading="For buyers" steps={BUYER_STEPS} />
          <StepTrack heading="For sellers" steps={SELLER_STEPS} />
        </div>
      </div>
    </section>
  )
}
