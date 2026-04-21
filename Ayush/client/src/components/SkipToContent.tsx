/** WCAG: first focusable control lets keyboard users bypass repeated navigation */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="bg-background text-foreground fixed top-4 left-4 z-9999 -translate-y-[200%] rounded-md border px-4 py-2 text-sm transition-transform focus:translate-y-0 focus:ring-2 focus:ring-ring focus:outline-none"
    >
      Skip to main content
    </a>
  )
}
