// This script runs before React hydrates to prevent theme flashing
export const themeInitScript = `
  (function() {
    try {
      // Helper function to get system preference
      function getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
        return 'light';
      }

      // Get theme from localStorage or default to 'system'
      const stored = localStorage.getItem('theme');
      let actualTheme;

      if (stored === 'light' || stored === 'dark') {
        // Use explicit light or dark theme
        actualTheme = stored;
      } else if (stored === 'system' || !stored) {
        // Use system preference
        actualTheme = getSystemTheme();
        // Set default to 'system' if not stored
        if (!stored) {
          localStorage.setItem('theme', 'system');
        }
      } else {
        // Fallback to system preference for invalid values
        actualTheme = getSystemTheme();
        localStorage.setItem('theme', 'system');
      }

      // Apply theme class to html element
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(actualTheme);
      document.documentElement.setAttribute('data-theme', actualTheme);
    } catch (e) {
      // Fallback to light theme if localStorage is not available
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;
