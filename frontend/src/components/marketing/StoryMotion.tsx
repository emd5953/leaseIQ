'use client'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
export function HeroMedia() {
  const video = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    const el = video.current
    if (!el || reduced || failed) return
    if (typeof IntersectionObserver !== 'function') {
      setFailed(true)
      return
    }
    const sync = () => {
      if (paused || document.hidden || el.getBoundingClientRect().bottom < 0) el.pause()
      else void el.play().catch(() => setFailed(true))
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) sync()
      else el.pause()
    })
    observer.observe(el)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      el.pause()
    }
  }, [paused, reduced, failed])
  return (
    <>
      <div className="hero-media" aria-hidden="true">
        <img src="/media/nyc-poster.jpg" alt="" width="1920" height="1080" fetchPriority="high" />
        {!reduced && !failed && (
          <video
            ref={video}
            src="/media/nyc-street.mp4"
            poster="/media/nyc-poster.jpg"
            muted
            loop
            playsInline
            preload="none"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="hero-shade" aria-hidden="true" />
      {!reduced && !failed && (
        <button
          className="media-control"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? 'Play background video' : 'Pause background video'}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? 'Play film' : 'Pause film'}</span>
        </button>
      )}
    </>
  )
}
export default function StoryMotion() {
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue
                observer?.unobserve(entry.target)
                if (query.matches || typeof entry.target.animate !== 'function') continue
                const animation = entry.target.animate(
                  [
                    { opacity: 0.55, transform: 'translateY(16px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                  ],
                  { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' },
                )
                animations.add(animation)
                animation.onfinish = () => animations.delete(animation)
              }
            },
            { threshold: 0.08 },
          )
        : null
    document.querySelectorAll('[data-reveal]').forEach((el) => observer?.observe(el))
    const reduce = () => {
      if (query.matches) {
        animations.forEach((a) => a.cancel())
        animations.clear()
      }
    }
    query.addEventListener('change', reduce)
    return () => {
      observer?.disconnect()
      animations.forEach((a) => a.cancel())
      query.removeEventListener('change', reduce)
    }
  }, [])
  return null
}
