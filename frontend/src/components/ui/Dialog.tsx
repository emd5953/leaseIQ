'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export default function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog?.showModal(); document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={e => { e.preventDefault(); close.current() }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close.current() } }}>
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4"><h2 className="text-xl">{title}</h2><button onClick={onClose} aria-label={`Close ${title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-card-alt"><X size={20} /></button></div>{children}
  </dialog>
}
