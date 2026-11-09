'use client'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
export const chapters = ['discover', 'investigate', 'compare', 'understand', 'decide']
export function HeroMedia() {
  const video = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync(); query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    const el = video.current
    if (!el || reduced || failed) return
    if (typeof IntersectionObserver !== 'function') { setFailed(true); return }
    const sync = () => { if (paused || document.hidden || el.getBoundingClientRect().bottom < 0) el.pause(); else void el.play().catch(() => setFailed(true)) }
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) sync(); else el.pause() })
    observer.observe(el); document.addEventListener('visibilitychange', sync); sync()
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); el.pause() }
  }, [paused, reduced, failed])
  return <><div className="hero-media" aria-hidden="true"><img src="/media/nyc-poster.jpg" alt="" width="1920" height="1080" fetchPriority="high" />{!reduced && !failed && <video ref={video} src="/media/nyc-street.mp4" poster="/media/nyc-poster.jpg" muted loop playsInline preload="none" onError={() => setFailed(true)} />}</div><div className="hero-shade" aria-hidden="true" />{!reduced && !failed && <button className="media-control" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play background video' : 'Pause background video'}>{paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'Play film' : 'Pause film'}</span></button>}</>
}
export default function StoryMotion() {
  const [active, setActive] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations: Animation[] = []
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return
      observer?.unobserve(entry.target)
      if (!query.matches && typeof entry.target.animate === 'function') {
        const group = entry.target.className.includes('demo')
        animations.push(entry.target.animate([{ opacity: .25, transform: `translateY(${group ? 46 : 30}px)` }, { opacity: 1, transform: 'translateY(0)' }], { duration: group ? 950 : 900, easing: 'cubic-bezier(.22,1,.36,1)' }))
        entry.target.querySelectorAll('[data-headline]').forEach((line, i) => animations.push(line.animate([{ transform: 'translateY(112%)' }, { transform: 'translateY(0)' }], { duration: 1050, delay: i * 100, easing: 'cubic-bezier(.16,1,.3,1)' })))
      }
    }), { threshold: .1 }) : null
    document.querySelectorAll('[data-reveal]').forEach(el => observer?.observe(el))
    let frame = 0
    const update = () => {
      frame = 0
      let current = -1
      if (window.scrollY > 40) chapters.forEach((id,i) => { if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) < window.innerHeight * .55) current = i })
      setActive(current)
      const end = document.getElementById('closing')
      setClosing(window.scrollY > 40 && !!end && end.getBoundingClientRect().top < window.innerHeight * .5)
      const endY = (end?.offsetTop ?? document.body.scrollHeight) - window.innerHeight
      setProgress(Math.min(1, Math.max(0, window.scrollY / Math.max(1,endY))))
    }
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    const reduce = () => { if (query.matches) animations.forEach(a => a.cancel()) }
    const layoutObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scroll) : null
    layoutObserver?.observe(document.body)
    update(); window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', scroll); query.addEventListener('change', reduce)
    return () => { observer?.disconnect(); layoutObserver?.disconnect(); animations.forEach(a => a.cancel()); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll); query.removeEventListener('change', reduce) }
  }, [])
  return <nav className={`chapter-nav ${closing ? 'chapter-nav-closing' : ''}`} aria-label="Explore the story"><div className="chapter-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} /><a className="chapter-start" href="#opening" aria-label="Return to opening">LQ<span> / NYC</span></a><div className="chapter-links">{chapters.map((chapter,i) => <a key={chapter} href={`#${chapter}`} aria-current={active === i ? 'step' : undefined}><span className="chapter-number">0{i+1}</span><span className="chapter-name">{chapter}</span><span className="chapter-mobile-name">{['Find','Look','Compare','Read','Decide'][i]}</span></a>)}</div><span className="chapter-end" aria-hidden="true">A MORE INFORMED MOVE ↗</span></nav>
}
