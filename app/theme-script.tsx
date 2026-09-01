/**
 * ThemeScript — Inline script injected into <head> before first paint.
 * Reads localStorage → falls back to prefers-color-scheme → defaults to dark.
 * Adds 'dark' or 'light' class to <html> synchronously to prevent FOUC.
 */
export function ThemeScript() {
  const script = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      return;
    }
    // Always default to dark mode when customer opens the website
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    if (!stored) {
      localStorage.setItem('theme', 'dark');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`.trim();

  return (
    <script
      id="theme-init"
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
