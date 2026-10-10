// ─── Sky Day/Night Theme Toggle ───────────────────────────────────────────────
(function () {
  const STORAGE_KEY = 'marjaah-theme';

  function getTheme() {
    var stored = localStorage.getItem('marjaah-theme') || localStorage.getItem('theme');
    return stored || 'dark';
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    // Sync all toggles on page
    document.querySelectorAll('.theme-switch__checkbox').forEach(function(cb) {
      cb.checked = (theme === 'dark');
    });
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply on load
  applyTheme(getTheme());

  // Bind toggles after DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());
    document.querySelectorAll('.theme-switch__checkbox').forEach(function(cb) {
      cb.addEventListener('change', toggleTheme);
    });
  });

  // Expose globally
  window.MarjaahTheme = { toggle: toggleTheme, get: getTheme, apply: applyTheme };
})();
