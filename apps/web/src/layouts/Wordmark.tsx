export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden><rect width="32" height="32" rx="6" fill="#0f5c4a" /><path d="M9 23 16 8l7 15M11.5 18h9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="text-[15px] font-semibold tracking-tight text-neutral-900">Alaa's Academy</span>
    </span>
  );
}
