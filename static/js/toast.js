// ─── Vanilla Toast Notifications ─────────────────────────────────────────────
(function () {
  function createToaster() {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container') || createToaster();
    const toast = document.createElement('div');
    const bg = type === 'error' ? '#EF4444' : type === 'info' ? '#4063B2' : '#10B981';
    toast.style.cssText = `
      background:var(--bg-surface,#fff);
      color:var(--text-primary,#0D1326);
      border:1px solid var(--border-color,rgba(0,0,0,.1));
      border-left:3px solid ${bg};
      border-radius:14px;
      padding:0.75rem 1rem;
      font-size:0.8125rem;
      font-family:var(--font-inter,system-ui);
      font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,.15);
      pointer-events:auto;
      animation:toastIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
      max-width:320px;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      toast.style.animation = 'toastOut 0.25s ease forwards';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  // Inject keyframes
  const style = document.createElement('style');
  style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes toastOut{to{opacity:0;transform:translateY(5px)}}';
  document.head.appendChild(style);

  window.Toast = { success: function(m){showToast(m,'success');}, error: function(m){showToast(m,'error');}, info: function(m){showToast(m,'info');} };
})();
