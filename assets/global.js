/* nzclo theme JS: drawers, variant picker, ajax cart. Everything degrades to
   plain form submits / page navigation if fetch fails. */
(function () {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- drawers (menu + cart) ---------- */

  function openDrawer(drawer) {
    drawer.classList.add('is-open');
    document.body.classList.add('overflow-hidden');
    var focusable = drawer.querySelector('button, a, input');
    if (focusable) focusable.focus();
  }
  function closeDrawer(drawer) {
    drawer.classList.remove('is-open');
    document.body.classList.remove('overflow-hidden');
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-drawer-open]');
    if (opener) {
      var target = qs(opener.getAttribute('data-drawer-open'));
      if (target) { e.preventDefault(); openDrawer(target); }
      return;
    }
    var closer = e.target.closest('[data-drawer-close]');
    if (closer) {
      var drawer = closer.closest('.menu-drawer, .cart-drawer');
      if (drawer) closeDrawer(drawer);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      qsa('.menu-drawer.is-open, .cart-drawer.is-open').forEach(closeDrawer);
    }
  });

  /* ---------- search bar toggle ---------- */

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-search-toggle]');
    if (!toggle) return;
    var bar = qs('.search-bar');
    if (!bar) return;
    bar.classList.toggle('is-open');
    if (bar.classList.contains('is-open')) {
      var input = bar.querySelector('input[type="search"]');
      if (input) input.focus();
    }
  });

  /* ---------- quantity inputs ---------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qty-change]');
    if (!btn) return;
    var wrap = btn.closest('.qty-input');
    var input = wrap && wrap.querySelector('input');
    if (!input) return;
    var step = parseInt(btn.getAttribute('data-qty-change'), 10) || 0;
    var min = parseInt(input.min, 10);
    if (isNaN(min)) min = 0;
    var next = (parseInt(input.value, 10) || 0) + step;
    if (next < min) next = min;
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------- variant picker ---------- */

  qsa('[data-product-form-wrapper]').forEach(function (wrapper) {
    var jsonEl = wrapper.querySelector('[data-product-json]');
    if (!jsonEl) return;
    var product;
    try { product = JSON.parse(jsonEl.textContent); } catch (err) { return; }

    var idInput = wrapper.querySelector('input[name="id"]');
    var priceEl = wrapper.querySelector('[data-price]');
    var buyBtn = wrapper.querySelector('[data-add-to-cart]');
    var buyText = wrapper.querySelector('[data-add-to-cart-text]');

    function money(cents) {
      var fmt = wrapper.getAttribute('data-money-format') || '${{amount}}';
      var amount = (cents / 100).toFixed(2);
      return fmt.replace(/\{\{\s*amount[^}]*\}\}/, amount);
    }

    function selectedOptions() {
      return qsa('.option-group', wrapper).map(function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    function findVariant(options) {
      return product.variants.find(function (v) {
        return v.options.every(function (opt, i) { return opt === options[i]; });
      });
    }

    function update() {
      var variant = findVariant(selectedOptions());
      if (!variant) {
        if (buyBtn) { buyBtn.disabled = true; }
        if (buyText) { buyText.textContent = 'unavailable'; }
        return;
      }
      if (idInput) idInput.value = variant.id;
      if (priceEl) {
        var html = money(variant.price);
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          html = '<s>' + money(variant.compare_at_price) + '</s>' + html;
        }
        priceEl.innerHTML = html;
      }
      if (buyBtn && buyText) {
        buyBtn.disabled = !variant.available;
        buyText.textContent = variant.available ? (buyBtn.getAttribute('data-label-add') || 'add to bag') : 'sold out';
      }
      if (history.replaceState && wrapper.hasAttribute('data-update-url')) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      }
    }

    wrapper.addEventListener('change', function (e) {
      if (e.target.closest('.option-group')) update();
    });
  });

  /* ---------- ajax cart ---------- */

  var drawerEnabled = document.documentElement.hasAttribute('data-cart-drawer');

  function refreshCartDrawer(open) {
    return fetch(window.location.pathname + '?sections=cart-drawer')
      .then(function (r) { return r.json(); })
      .then(function (sections) {
        var html = sections['cart-drawer'];
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('#cart-drawer');
        var current = qs('#cart-drawer');
        if (fresh && current) {
          current.innerHTML = fresh.innerHTML;
        }
        var freshCount = doc.querySelector('[data-cart-count-source]');
        qsa('[data-cart-count]').forEach(function (el) {
          var n = freshCount ? freshCount.getAttribute('data-cart-count-source') : null;
          if (n !== null) el.textContent = n;
        });
        if (open) {
          var drawer = qs('#cart-drawer');
          if (drawer) openDrawer(drawer);
        }
      });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('form[data-ajax-add]')) return;
    if (!drawerEnabled || !window.fetch) return; /* fall back to normal submit -> /cart */
    e.preventDefault();
    var btn = form.querySelector('[data-add-to-cart]');
    if (btn) btn.disabled = true;
    fetch('/cart/add.js', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (data) { throw new Error(data.description || 'could not add to bag'); });
        return r.json();
      })
      .then(function () { return refreshCartDrawer(true); })
      .catch(function (err) {
        alert(err.message || 'could not add to bag');
      })
      .then(function () { if (btn) btn.disabled = false; });
  });

  /* drawer line quantity + remove */
  document.addEventListener('change', function (e) {
    var input = e.target.closest('#cart-drawer [data-line-qty]');
    if (!input) return;
    changeLine(input.getAttribute('data-line-key'), parseInt(input.value, 10) || 0);
  });
  document.addEventListener('click', function (e) {
    var remove = e.target.closest('#cart-drawer [data-line-remove]');
    if (!remove) return;
    e.preventDefault();
    changeLine(remove.getAttribute('data-line-key'), 0);
  });

  function changeLine(key, qty) {
    if (!key) return;
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    })
      .then(function (r) { return r.json(); })
      .then(function () { return refreshCartDrawer(false); })
      .catch(function () { window.location.href = '/cart'; });
  }

  /* cart icon opens drawer instead of navigating (when enabled) */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-cart-link]');
    if (!link || !drawerEnabled || !window.fetch) return;
    e.preventDefault();
    refreshCartDrawer(true).catch(function () { window.location.href = link.href; });
  });
})();
