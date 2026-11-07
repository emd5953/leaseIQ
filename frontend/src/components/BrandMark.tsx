export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
    >
      <rect width="34" height="34" rx="8" fill="currentColor" />
      <path d="M9 25V9h9v16M18 15h7v10M6 25h22" stroke="#0D1C25" strokeWidth="2" />
      <path d="M12 13h3m-3 4h3m6 2h1" stroke="#0D1C25" strokeWidth="2" />
    </svg>
  )
}
