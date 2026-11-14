class AdminAppColorsClass {
  constructor() {
    this._defaults = {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primaryLight: '#DBEAFE',
      primarySubtle: 'rgba(37, 99, 235, 0.08)',
      primaryBorder: 'rgba(37, 99, 235, 0.25)',

      secondary: '#475569',
      secondaryHover: '#334155',
      secondaryLight: '#F1F5F9',
      accent: '#0284C7',

      pageBackground: '#F8FAFC',
      cardBackground: '#FFFFFF',
      cardBackgroundSubtle: '#F8FAFC',
      cardBackgroundElevated: '#FFFFFF',

      sidebarBackground: '#FFFFFF',
      sidebarActiveBackground: '#EFF6FF',
      sidebarActiveText: '#1D4ED8',
      sidebarText: '#64748B',
      sidebarTextHover: '#0F172A',
      sidebarBorder: '#E2E8F0',

      headerBackground: '#FFFFFF',
      headerBorder: '#E2E8F0',

      primaryText: '#0F172A',
      secondaryText: '#475569',
      mutedText: '#94A3B8',

      borderColor: '#E2E8F0',
      borderSubtle: '#F1F5F9',
      borderStrong: '#CBD5E1',
      dividerColor: '#E2E8F0',

      buttonPrimaryBg: '#2563EB',
      buttonPrimaryHover: '#1D4ED8',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondaryBg: '#F8FAFC',
      buttonSecondaryHover: '#F1F5F9',
      buttonSecondaryText: '#334155',

      inputBackground: '#FFFFFF',
      inputBorder: '#CBD5E1',
      inputText: '#0F172A',
      inputPlaceholder: '#94A3B8',
      inputFocus: '#2563EB',
      inputFocusRing: 'rgba(37, 99, 235, 0.15)',

      success: '#10B981',
      successSubtle: 'rgba(16, 185, 129, 0.10)',
      successText: '#047857',

      warning: '#F59E0B',
      warningSubtle: 'rgba(245, 158, 11, 0.10)',
      warningText: '#B45309',

      error: '#EF4444',
      errorSubtle: 'rgba(239, 68, 68, 0.10)',
      errorText: '#B91C1C',

      info: '#0284C7',
      infoSubtle: 'rgba(2, 132, 199, 0.10)',
      infoText: '#0369A1',

      hoverBg: '#F8FAFC',
      selectedBg: '#EFF6FF',
      tableHeaderBg: '#F8FAFC',
      tableRowHover: '#F8FAFC',
      tableRowBorder: '#F1F5F9'
    };

    this._colors = { ...this._defaults };
    this._listeners = new Set();
    this._styleEl = null;

    this.init();
  }

  init() {
    this._ensureStyleElement();
    this.apply();
  }

  _ensureStyleElement() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('admin-app-colors-sheet');
    if (!el) {
      el = document.createElement('style');
      el.id = 'admin-app-colors-sheet';
      document.head.appendChild(el);
    }
    this._styleEl = el;
  }

  _hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const clean = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    } else {
      return hex;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  _adjustBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  apply(newColors = {}) {
    if (newColors && typeof newColors === 'object') {
      Object.assign(this._colors, newColors);
    }

    if (newColors.primary && !newColors.primaryHover) {
      this._colors.primaryHover = this._adjustBrightness(this._colors.primary, -12);
    }
    if (newColors.primary && !newColors.primarySubtle) {
      this._colors.primarySubtle = this._hexToRgba(this._colors.primary, 0.08);
    }
    if (newColors.primary && !newColors.primaryBorder) {
      this._colors.primaryBorder = this._hexToRgba(this._colors.primary, 0.25);
    }
    if (newColors.primary && !newColors.buttonPrimaryBg) {
      this._colors.buttonPrimaryBg = this._colors.primary;
      this._colors.buttonPrimaryHover = this._colors.primaryHover;
    }
    if (newColors.primary && !newColors.inputFocus) {
      this._colors.inputFocus = this._colors.primary;
      this._colors.inputFocusRing = this._hexToRgba(this._colors.primary, 0.15);
    }
    if (newColors.primary && !newColors.sidebarActiveText) {
      this._colors.sidebarActiveText = this._colors.primary;
    }

    if (newColors.pageBackground && !newColors.cardBackgroundSubtle) {
      this._colors.cardBackgroundSubtle = this._colors.pageBackground;
    }

    this._applyCssVariables();
    this._notifyListeners();
    return this;
  }

  _applyCssVariables() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const c = this._colors;

    root.style.setProperty('--admin-primary', c.primary);
    root.style.setProperty('--admin-primary-hover', c.primaryHover);
    root.style.setProperty('--admin-primary-light', c.primaryLight);
    root.style.setProperty('--admin-primary-subtle', c.primarySubtle);
    root.style.setProperty('--admin-primary-border', c.primaryBorder);
    root.style.setProperty('--admin-primary-text', c.primaryText);

    root.style.setProperty('--admin-secondary', c.secondary);
    root.style.setProperty('--admin-secondary-hover', c.secondaryHover);
    root.style.setProperty('--admin-secondary-light', c.secondaryLight);
    root.style.setProperty('--admin-accent', c.accent);

    root.style.setProperty('--admin-bg-base', c.pageBackground);
    root.style.setProperty('--admin-bg-surface', c.cardBackground);
    root.style.setProperty('--admin-bg-surface2', c.cardBackgroundSubtle);
    root.style.setProperty('--admin-bg-surface3', c.hoverBg);
    root.style.setProperty('--admin-bg-active', c.selectedBg);

    root.style.setProperty('--admin-sidebar-bg', c.sidebarBackground);
    root.style.setProperty('--admin-sidebar-active-bg', c.sidebarActiveBackground);
    root.style.setProperty('--admin-sidebar-active-text', c.sidebarActiveText);
    root.style.setProperty('--admin-sidebar-text', c.sidebarText);
    root.style.setProperty('--admin-sidebar-text-hover', c.sidebarTextHover);
    root.style.setProperty('--admin-sidebar-border', c.sidebarBorder);

    root.style.setProperty('--admin-header-bg', c.headerBackground);
    root.style.setProperty('--admin-header-border', c.headerBorder);

    root.style.setProperty('--admin-text-main', c.primaryText);
    root.style.setProperty('--admin-text-secondary', c.secondaryText);
    root.style.setProperty('--admin-text-muted', c.mutedText);

    root.style.setProperty('--admin-border', c.borderColor);
    root.style.setProperty('--admin-border-subtle', c.borderSubtle);
    root.style.setProperty('--admin-border-strong', c.borderStrong);
    root.style.setProperty('--admin-divider', c.dividerColor);

    root.style.setProperty('--admin-btn-primary-bg', c.buttonPrimaryBg);
    root.style.setProperty('--admin-btn-primary-hover', c.buttonPrimaryHover);
    root.style.setProperty('--admin-btn-primary-text', c.buttonPrimaryText);
    root.style.setProperty('--admin-btn-secondary-bg', c.buttonSecondaryBg);
    root.style.setProperty('--admin-btn-secondary-hover', c.buttonSecondaryHover);
    root.style.setProperty('--admin-btn-secondary-text', c.buttonSecondaryText);

    root.style.setProperty('--admin-input-bg', c.inputBackground);
    root.style.setProperty('--admin-input-border', c.inputBorder);
    root.style.setProperty('--admin-input-text', c.inputText);
    root.style.setProperty('--admin-input-placeholder', c.inputPlaceholder);
    root.style.setProperty('--admin-input-focus', c.inputFocus);
    root.style.setProperty('--admin-input-focus-ring', c.inputFocusRing);

    root.style.setProperty('--admin-success', c.success);
    root.style.setProperty('--admin-success-subtle', c.successSubtle);
    root.style.setProperty('--admin-success-text', c.successText);

    root.style.setProperty('--admin-warning', c.warning);
    root.style.setProperty('--admin-warning-subtle', c.warningSubtle);
    root.style.setProperty('--admin-warning-text', c.warningText);

    root.style.setProperty('--admin-danger', c.error);
    root.style.setProperty('--admin-danger-subtle', c.errorSubtle);
    root.style.setProperty('--admin-danger-text', c.errorText);

    root.style.setProperty('--admin-info', c.info);
    root.style.setProperty('--admin-info-subtle', c.infoSubtle);
    root.style.setProperty('--admin-info-text', c.infoText);

    root.style.setProperty('--admin-table-header-bg', c.tableHeaderBg);
    root.style.setProperty('--admin-table-row-hover', c.tableRowHover);
    root.style.setProperty('--admin-table-row-border', c.tableRowBorder);

    if (document.body) {
      document.body.style.backgroundColor = c.pageBackground;
      document.body.style.color = c.primaryText;
    }

    this._ensureStyleElement();
    if (this._styleEl) {
      this._styleEl.textContent = `
        :root {
          color-scheme: light;
        }
        body {
          background-color: ${c.pageBackground} !important;
          color: ${c.primaryText} !important;
        }
        #admin-sidebar {
          background-color: ${c.sidebarBackground} !important;
          border-right-color: ${c.sidebarBorder} !important;
        }
        #admin-sidebar .sidebar-nav-item {
          color: ${c.sidebarText} !important;
        }
        #admin-sidebar .sidebar-nav-item:hover:not(.active) {
          background-color: ${c.hoverBg} !important;
          color: ${c.sidebarTextHover} !important;
        }
        #admin-sidebar .sidebar-nav-item.active {
          background-color: ${c.sidebarActiveBackground} !important;
          color: ${c.sidebarActiveText} !important;
          border-left-color: ${c.primary} !important;
          font-weight: 700 !important;
        }
        #admin-topbar, header {
          background-color: ${c.headerBackground} !important;
          border-bottom-color: ${c.headerBorder} !important;
        }
        .admin-card {
          background-color: ${c.cardBackground} !important;
          border-color: ${c.borderColor} !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03) !important;
        }
        .admin-card:hover {
          border-color: ${c.borderStrong} !important;
        }
        .admin-card-inner {
          background-color: ${c.cardBackgroundSubtle} !important;
          border-color: ${c.borderSubtle} !important;
        }
        .admin-input, input.admin-input, select.admin-input, textarea.admin-input {
          background-color: ${c.inputBackground} !important;
          border-color: ${c.inputBorder} !important;
          color: ${c.inputText} !important;
        }
        .admin-input:focus, input.admin-input:focus, select.admin-input:focus, textarea.admin-input:focus {
          border-color: ${c.inputFocus} !important;
          box-shadow: 0 0 0 3px ${c.inputFocusRing} !important;
          outline: none !important;
        }
        .btn-primary, button.bg-primary, .bg-primary, button.bg-indigo-600, .bg-indigo-600, a.bg-indigo-600 {
          background-color: ${c.buttonPrimaryBg} !important;
          color: ${c.buttonPrimaryText} !important;
        }
        .btn-primary:hover, button.bg-primary:hover, button.bg-indigo-600:hover, .bg-indigo-600:hover, a.bg-indigo-600:hover {
          background-color: ${c.buttonPrimaryHover} !important;
        }
        .approval-tab-btn.active, .period-pill.active, .chart-view-btn.active {
          background-color: ${c.primarySubtle} !important;
          color: ${c.primary} !important;
          border-color: ${c.primary} !important;
        }
        table thead tr, tr.bg-admin-surface2\\/50, thead.bg-slate-900\\/60 {
          background-color: ${c.tableHeaderBg} !important;
          border-bottom: 1px solid ${c.borderColor} !important;
        }
        table thead th {
          color: ${c.secondaryText} !important;
        }
        table tbody tr {
          border-bottom: 1px solid ${c.tableRowBorder} !important;
          color: ${c.primaryText} !important;
        }
        table tbody tr:hover, tr.hover\\:bg-slate-800\\/30:hover, tr.hover\\:bg-slate-800\\/40:hover {
          background-color: ${c.tableRowHover} !important;
        }
        h1, h2, h3, h4, h5, h6,
        .admin-card h1, .admin-card h2, .admin-card h3, .admin-card h4, .admin-card h5, .admin-card h6 {
          color: ${c.primaryText} !important;
        }
        .admin-card .text-white:not(button):not(.btn):not([type="submit"]):not(.avatar):not(#admin-staff-avatar):not(.bg-primary *):not([data-keep-white]),
        #order-details-modal .text-white:not(button):not(.btn):not([data-keep-white]),
        #pane-approvals .text-white:not(button):not(.btn):not([data-keep-white]),
        #pane-audit .text-white:not(button):not(.btn):not([data-keep-white]) {
          color: ${c.primaryText} !important;
        }
        #order-details-modal > div,
        #order-invoice-modal-card,
        #create-order-modal > div,
        #product-modal > div,
        #user-modal > div,
        #role-modal > div,
        #banner-modal > div,
        #location-modal > div,
        #approval-diff-modal > div,
        #customer-details-modal > div,
        #audit-modal > div,
        #admin-login-modal > div {
          background-color: ${c.cardBackground} !important;
          border-color: ${c.borderColor} !important;
          color: ${c.primaryText} !important;
        }
        .bg-slate-900,
        .bg-slate-900\\/60,
        .bg-slate-900\\/80,
        .bg-slate-900\\/90,
        .bg-slate-900\\/95,
        .bg-slate-800,
        .bg-slate-800\\/80,
        .bg-slate-800\\/60,
        .bg-slate-800\\/40,
        .bg-slate-800\\/30,
        .bg-slate-950,
        .bg-slate-950\\/80,
        .bg-slate-950\\/40 {
          background-color: ${c.cardBackgroundSubtle} !important;
        }
        .border-slate-800,
        .border-slate-800\\/60,
        .border-slate-800\\/50,
        .border-slate-700,
        .border-slate-700\\/80,
        .border-slate-700\\/60,
        .border-slate-700\\/40 {
          border-color: ${c.borderColor} !important;
        }
        .text-indigo-400, .text-indigo-300, .text-indigo-600 {
          color: ${c.primary} !important;
        }
        .bg-indigo-500\\/10, .bg-indigo-600\\/10, .bg-indigo-600\\/20 {
          background-color: ${c.primarySubtle} !important;
        }
        .border-indigo-500, .border-indigo-500\\/20, .border-indigo-500\\/30 {
          border-color: ${c.primaryBorder} !important;
        }
      `;
    }
  }

  set(keyOrObject, value) {
    if (typeof keyOrObject === 'string') {
      const patch = {};
      patch[keyOrObject] = value;
      return this.apply(patch);
    }
    if (keyOrObject && typeof keyOrObject === 'object') {
      return this.apply(keyOrObject);
    }
    return this;
  }

  get(key) {
    return this._colors[key];
  }

  getAll() {
    return { ...this._colors };
  }

  reset() {
    this._colors = { ...this._defaults };
    return this.apply();
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
    }
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    this._listeners.delete(listener);
  }

  _notifyListeners() {
    const snapshot = this.getAll();
    this._listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('AdminAppColors listener error:', err);
      }
    });
  }
}

const rawColorsInstance = new AdminAppColorsClass();

window.AdminAppColors = new Proxy(rawColorsInstance, {
  get(target, prop) {
    if (prop in target) {
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    }
    if (prop in target._colors) {
      return target._colors[prop];
    }
    return undefined;
  },
  set(target, prop, value) {
    if (prop in target._colors) {
      target.set(prop, value);
      return true;
    }
    target[prop] = value;
    return true;
  }
});

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AdminAppColors.apply();
    });
  } else {
    window.AdminAppColors.apply();
  }
}
