import { useState } from 'react'

const FAQS = [
  {
    question: 'Is Marketplace free to use?',
    answer:
      'Yes. Posting listings is free, with a limit on how many you can have active at once. A Pro subscription is optional — it removes that limit and gets your listings seen first.',
  },
  {
    question: 'How do I contact a seller?',
    answer:
      'Message them directly from the listing page. You\'ll need an account to send a message, but browsing and viewing full listing details never requires one.',
  },
  {
    question: 'What does "Boosted" mean on a listing?',
    answer:
      'Boosted listings belong to sellers on the Pro plan. They\'re shown first in search and category results and carry a badge, so it\'s always clear which listings paid for placement.',
  },
  {
    question: 'Does Marketplace handle payment or delivery?',
    answer:
      'No — Marketplace is a connection layer, not a checkout platform. Buyers and sellers agree the price and payment method directly and arrange their own handover. We don\'t hold funds or ship anything.',
  },
  {
    question: 'How long does a listing stay active?',
    answer:
      '30 days from posting, then it expires — hidden from search but still editable and easy to renew. Pro sellers get auto-renewal instead of relisting manually.',
  },
  {
    question: 'How do I stay safe meeting a buyer or seller?',
    answer:
      'Keep the conversation in-app until you\'ve agreed details, meet in a public place for handovers, and inspect goods before you pay. Treat it the same as any classifieds trade.',
  },
]

export function FAQSection() {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set())

  function toggle(question: string) {
    setOpenQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(question)) next.delete(question)
      else next.add(question)
      return next
    })
  }

  return (
    <section className="bg-brand-cream px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h2 className="mb-6 text-h1 text-brand-dark-green sm:mb-8">Frequently asked questions</h2>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {FAQS.map((faq) => {
          const isOpen = openQuestions.has(faq.question)
          return (
            <div key={faq.question} className="rounded-2xl bg-white px-5 py-4 shadow-card sm:px-6 sm:py-5">
              <button
                type="button"
                onClick={() => toggle(faq.question)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 text-left text-body font-semibold text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              >
                {faq.question}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 shrink-0 text-brand-dark/40 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="pt-2.5 text-body-sm text-brand-dark/65">{faq.answer}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
