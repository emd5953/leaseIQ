import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Hero from '@/components/home/Hero'
import Features from '@/components/home/Features'
import HowItWorks from '@/components/home/HowItWorks'
import Stats from '@/components/home/Stats'
import CTA from '@/components/home/CTA'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  )
}
