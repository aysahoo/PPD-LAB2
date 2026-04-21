/** WCAG: first focusable control lets keyboard users bypass repeated navigation */
export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content">
      Skip to main content
    </a>
  )
}
