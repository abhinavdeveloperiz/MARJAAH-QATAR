// ─── Sky Day/Night Theme Toggle ───────────────────────────────────────────────
(function () {
  const STORAGE_KEY = 'marjaah-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    // Sync all toggles on page
    document.querySelectorAll('.theme-switch__checkbox').forEach(function(cb) {
      cb.checked = (theme === 'dark');
    });
    localStorage.setItem(STORAGE_KEY, theme);
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
