export default function Stats() {
  const stats = [
    { value: '500+', label: 'New Listings Daily' },
    { value: '15', label: 'Data Sources' },
    { value: '24/7', label: 'Real-time Updates' },
    { value: '<30s', label: 'AI Lease Analysis' },
  ]

  return (
    <section className="py-16 md:py-24 px-6 lg:px-8 bg-card-alt">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center space-y-2">
              <p className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-sm md:text-base text-foreground/70 tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
