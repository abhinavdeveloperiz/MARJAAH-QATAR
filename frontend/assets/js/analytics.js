/**
 * M.SHOP Qatar — Unified Analytics & Tracking Integration
 * Supports: Google Analytics 4 (GA4), Google Search Console, Meta (Facebook) Pixel, Snapchat Pixel
 * Configured to track pageviews and eCommerce conversions (ViewContent, AddToCart, InitiateCheckout, Purchase)
 */

(function (window) {
  'use strict';

  // Config: Replace or define on window before loading, or configure in Admin settings
  const config = {
    gaMeasurementId: window.MSHOP_GA_MEASUREMENT_ID || '', // e.g. 'G-XXXXXXXXXX'
    metaPixelId: window.MSHOP_META_PIXEL_ID || '',         // e.g. '123456789012345'
    snapchatPixelId: window.MSHOP_SNAPCHAT_PIXEL_ID || '', // e.g. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    gscVerification: window.MSHOP_GSC_VERIFICATION || '',  // e.g. 'google-site-verification-token'
  };

  // 1. Google Search Console Verification Meta Tag (if present)
  if (config.gscVerification) {
    let meta = document.querySelector('meta[name="google-site-verification"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'google-site-verification';
      document.head.appendChild(meta);
    }
    meta.content = config.gscVerification;
  }

  // 2. Google Analytics 4 (gtag.js)
  if (config.gaMeasurementId) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaMeasurementId}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', config.gaMeasurementId, { send_page_view: true });
  }

  // 3. Meta Pixel (Facebook)
  if (config.metaPixelId) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', config.metaPixelId);
    window.fbq('track', 'PageView');
  }

  // 4. Snapchat Pixel
  if (config.snapchatPixelId) {
    (function (e, t, n) {
      if (e.snaptr) return;
      var a = (e.snaptr = function () {
        a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
      });
      a.queue = [];
      var s = 'script';
      var r = t.createElement(s);
      r.async = !0;
      r.src = n;
      var u = t.getElementsByTagName(s)[0];
      u.parentNode.insertBefore(r, u);
    })(window, document, 'https://sc-static.net/scevent.min.js');

    window.snaptr('init', config.snapchatPixelId, {});
    window.snaptr('track', 'PAGE_VIEW');
  }

  // Unified Event Tracker API
  const Tracker = {
    trackViewItem: function (item) {
      if (window.gtag && config.gaMeasurementId) {
        window.gtag('event', 'view_item', {
          currency: 'QAR',
          value: item.price || 0,
          items: [{ item_id: item.sku || item.id, item_name: item.name, price: item.price, item_category: item.category }]
        });
      }
      if (window.fbq && config.metaPixelId) {
        window.fbq('track', 'ViewContent', {
          content_name: item.name,
          content_ids: [item.sku || item.id],
          content_type: 'product',
          value: item.price || 0,
          currency: 'QAR'
        });
      }
      if (window.snaptr && config.snapchatPixelId) {
        window.snaptr('track', 'VIEW_CONTENT', {
          item_category: item.category,
          item_ids: [item.sku || item.id],
          price: item.price,
          currency: 'QAR'
        });
      }
    },

    trackAddToCart: function (item) {
      if (window.gtag && config.gaMeasurementId) {
        window.gtag('event', 'add_to_cart', {
          currency: 'QAR',
          value: item.price || 0,
          items: [{ item_id: item.sku || item.id, item_name: item.name, price: item.price, quantity: item.quantity || 1 }]
        });
      }
      if (window.fbq && config.metaPixelId) {
        window.fbq('track', 'AddToCart', {
          content_name: item.name,
          content_ids: [item.sku || item.id],
          content_type: 'product',
          value: item.price || 0,
          currency: 'QAR'
        });
      }
      if (window.snaptr && config.snapchatPixelId) {
        window.snaptr('track', 'ADD_CART', {
          item_ids: [item.sku || item.id],
          price: item.price,
          currency: 'QAR'
        });
      }
    },

    trackInitiateCheckout: function (cart) {
      const total = cart.total || cart.subtotal || 0;
      if (window.gtag && config.gaMeasurementId) {
        window.gtag('event', 'begin_checkout', {
          currency: 'QAR',
          value: total,
          items: (cart.items || []).map(i => ({ item_id: i.sku || i.id, item_name: i.name, price: i.price, quantity: i.quantity }))
        });
      }
      if (window.fbq && config.metaPixelId) {
        window.fbq('track', 'InitiateCheckout', {
          value: total,
          currency: 'QAR',
          num_items: (cart.items || []).length
        });
      }
      if (window.snaptr && config.snapchatPixelId) {
        window.snaptr('track', 'START_CHECKOUT', {
          price: total,
          currency: 'QAR',
          number_items: (cart.items || []).length
        });
      }
    },

    trackPurchase: function (order) {
      const total = order.totalAmount || order.total || 0;
      if (window.gtag && config.gaMeasurementId) {
        window.gtag('event', 'purchase', {
          transaction_id: order.orderNumber || order.id,
          currency: 'QAR',
          value: total,
          items: (order.items || []).map(i => ({ item_id: i.sku || i.id, item_name: i.name, price: i.price, quantity: i.quantity }))
        });
      }
      if (window.fbq && config.metaPixelId) {
        window.fbq('track', 'Purchase', {
          value: total,
          currency: 'QAR',
          content_type: 'product'
        });
      }
      if (window.snaptr && config.snapchatPixelId) {
        window.snaptr('track', 'PURCHASE', {
          price: total,
          currency: 'QAR',
          transaction_id: order.orderNumber || order.id
        });
      }
    }
  };

  window.MShopTracker = Tracker;
})(window);
