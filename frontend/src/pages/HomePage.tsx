import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Category } from '../api/types'
import { CategoryShowcase } from '../components/home/CategoryShowcase'
import { Footer } from '../components/home/Footer'
import { Hero } from '../components/home/Hero'
import { HowItWorks } from '../components/home/HowItWorks'
import { StatsStrip } from '../components/home/StatsStrip'
import { Subscription } from '../components/home/Subscription'
import { TrustSection } from '../components/home/TrustSection'

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const topLevelCategories = categories.filter((c) => c.parent_id === null)

  return (
    <main className="min-h-screen">
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <CategoryShowcase categories={topLevelCategories} />
      <Subscription />
      <TrustSection />
      <Footer />
    </main>
  )
}
