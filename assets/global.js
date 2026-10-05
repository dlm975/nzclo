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

  /* ---------- floating header over the hero ---------- */

  var overlayHeader = qs('.site-header--overlay');
  if (overlayHeader) {
    var heroEl = qs('.hero');
    var setSolid = function (solid) {
      overlayHeader.classList.toggle('site-header--solid', solid);
    };

    /* Pin the header once the hero is half scrolled. The threshold is read
       from the hero's live rect on every frame, so it follows whatever height
       the hero actually has at the current breakpoint with no stored value to
       go stale on resize or orientation change. */
    var headerSection = overlayHeader.closest('.shopify-section') || overlayHeader.parentElement;
    var heroCopy = heroEl ? qs('.hero__content', heroEl) : null;

    if (heroEl) {
      var updateHeader = function () {
        var rect = heroEl.getBoundingClientRect();
        var headerH = overlayHeader.offsetHeight || 64;

        /* unchanged: pin once the hero is half scrolled */
        if (headerSection) {
          headerSection.classList.toggle('header--pinned', rect.top <= -(rect.height / 2));
        }

        /* Go solid before the header can reach the hero copy rather than once
           the hero has scrolled past. Measured from the live position of the
           hero's own text/button block, with one header height of lead, so the
           background is already in place by the time they would overlap. Both
           terms are measured, so this follows the hero at any breakpoint. */
        var copyTop = heroCopy ? heroCopy.getBoundingClientRect().top : rect.bottom;
        setSolid(copyTop <= headerH * 2);
      };
      window.addEventListener('scroll', updateHeader, { passive: true });
      window.addEventListener('resize', updateHeader, { passive: true });
      updateHeader();
    } else {
      var onScrollNoHero = function () {
        setSolid(window.pageYOffset > (overlayHeader.offsetHeight || 64));
      };
      window.addEventListener('scroll', onScrollNoHero, { passive: true });
      onScrollNoHero();
    }
  }

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

  /* ---------- product card: colour swatches + quick add ---------- */
  /* Delegated, so cards rendered later (sections re-render, paginated grids)
     behave identically to those present at first paint. */

  document.addEventListener('click', function (e) {
    var swatch = e.target.closest('[data-swatch]');
    if (!swatch) return;
    e.preventDefault();

    var card = swatch.closest('.product-card');
    if (!card) return;

    qsa('[data-swatch]', card).forEach(function (other) {
      other.setAttribute('aria-pressed', other === swatch ? 'true' : 'false');
    });

    var src = swatch.getAttribute('data-src');
    if (src) {
      var shot = qs('.product-card__shot .pc-img--primary', card);
      var bleed = qs('.product-card__bleed .pc-img--primary', card);
      if (shot) {
        shot.src = src;
        var srcset = swatch.getAttribute('data-srcset');
        if (srcset) shot.srcset = srcset;
        var alt = swatch.getAttribute('data-alt');
        if (alt) shot.alt = alt;
      }
      if (bleed) {
        var bleedSrc = swatch.getAttribute('data-bleed');
        if (bleedSrc) {
          bleed.removeAttribute('srcset');
          bleed.src = bleedSrc;
        }
      }
      /* pin the chosen image so the hover swap cannot replace it */
      card.classList.add('product-card--variant-selected');
    }

    var variantId = swatch.getAttribute('data-variant-id');
    var addButton = qs('[data-card-add]', card);
    if (variantId && addButton) addButton.setAttribute('data-variant-id', variantId);

    /* a colour with no stock puts the card into its pre-order state, which
       swaps the badge and the add control over to the request link */
    card.classList.toggle(
      'product-card--preorder',
      swatch.getAttribute('data-available') === 'false'
    );
  });

  function updateCartCount() {
    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        qsa('[data-cart-count]').forEach(function (el) { el.textContent = cart.item_count; });
      });
  }

  document.addEventListener('click', function (e) {
    var button = e.target.closest('[data-card-add]');
    if (!button) return;
    e.preventDefault();

    var variantId = button.getAttribute('data-variant-id');
    if (!variantId || button.classList.contains('is-busy')) return;

    if (!window.fetch) {
      var card = button.closest('.product-card');
      var link = card && qs('.product-card__link', card);
      if (link) window.location.href = link.href;
      return;
    }

    button.classList.add('is-busy');
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (data) {
            throw new Error(data.description || data.message || 'could not add to bag');
          });
        }
        return r.json();
      })
      .then(function () {
        button.classList.remove('is-busy');
        button.classList.add('is-added');
        setTimeout(function () { button.classList.remove('is-added'); }, 1800);
        return drawerEnabled ? refreshCartDrawer(true) : updateCartCount();
      })
      .catch(function (err) {
        button.classList.remove('is-busy');
        alert(err.message || 'could not add to bag');
      });
  });

  /* ---------- product gallery thumbnails ---------- */

  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-gallery-thumb]');
    if (!thumb) return;
    var id = thumb.getAttribute('data-media-id');
    var scope = thumb.closest('.product-page') || document;

    qsa('[data-gallery-thumb]', scope).forEach(function (t) {
      var on = t === thumb;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    qsa('[data-gallery-item]', scope).forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-media-id') === id);
    });
  });

  /* ---------- add-on carousel + mini product sheet ---------- */

  var miniPdp = { product: null, names: [], values: [], selected: [] };

  function miniMoney(cents) {
    var root = qs('#mini-pdp');
    var fmt = (root && root.getAttribute('data-money-format')) || '${{amount}}';
    return fmt.replace(/\{\{\s*amount[^}]*\}\}/, (cents / 100).toFixed(2));
  }

  function closeMiniPdp() {
    var root = qs('#mini-pdp');
    if (!root) return;
    root.hidden = true;
    var body = qs('[data-minipdp-body]', root);
    if (body) body.innerHTML = '';
    miniPdp.product = null;
  }

  function miniMatchingVariant(selected) {
    var p = miniPdp.product;
    if (!p) return null;
    for (var i = 0; i < p.variants.length; i++) {
      var v = p.variants[i], ok = true;
      for (var j = 0; j < selected.length; j++) {
        if (selected[j] !== null && v.options[j] !== selected[j]) { ok = false; break; }
      }
      if (ok) return v;
    }
    return null;
  }

  /* a value is offerable if some available variant carries it alongside the
     other options already chosen */
  function miniValueOffered(index, value) {
    return miniPdp.product.variants.some(function (v) {
      if (!v.available || v.options[index] !== value) return false;
      for (var j = 0; j < miniPdp.selected.length; j++) {
        if (j !== index && miniPdp.selected[j] !== null && v.options[j] !== miniPdp.selected[j]) return false;
      }
      return true;
    });
  }

  function miniUpdate() {
    var p = miniPdp.product;
    if (!p) return;
    var variant = miniMatchingVariant(miniPdp.selected);

    var priceEl = qs('[data-minipdp-price]');
    if (priceEl) {
      if (variant) {
        var html = miniMoney(variant.price);
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          html = '<s>' + miniMoney(variant.compare_at_price) + '</s>' + html;
        }
        priceEl.innerHTML = html;
      }
    }

    var imgEl = qs('[data-minipdp-image]');
    if (imgEl && variant && variant.featured_image && variant.featured_image.src) {
      imgEl.src = variant.featured_image.src;
    }

    qsa('[data-minipdp-value]').forEach(function (btn) {
      var idx = parseInt(btn.getAttribute('data-option-index'), 10);
      var val = btn.getAttribute('data-option-value');
      btn.setAttribute('aria-pressed', miniPdp.selected[idx] === val ? 'true' : 'false');
      btn.disabled = !miniValueOffered(idx, val);
    });

    var addBtn = qs('[data-minipdp-add]');
    if (addBtn) {
      var ready = variant && variant.available && miniPdp.selected.every(function (v) { return v !== null; });
      addBtn.disabled = !ready;
      addBtn.setAttribute('data-variant-id', variant ? variant.id : '');
      var label = qs('[data-minipdp-add-text]', addBtn);
      if (label) {
        label.textContent = !variant ? 'unavailable'
          : (!variant.available ? 'sold out' : (addBtn.getAttribute('data-label-add') || 'add to bag'));
      }
    }
  }

  function renderMiniPdp(product) {
    var body = qs('[data-minipdp-body]');
    var root = qs('#mini-pdp');
    if (!body || !root) return;

    miniPdp.product = product;
    miniPdp.names = (product.options || []).map(function (o) { return typeof o === 'string' ? o : o.name; });
    miniPdp.values = miniPdp.names.map(function (_, i) {
      var seen = [];
      product.variants.forEach(function (v) { if (seen.indexOf(v.options[i]) === -1) seen.push(v.options[i]); });
      return seen;
    });

    var hasRealOptions = !(miniPdp.names.length === 1 && miniPdp.values[0].length === 1 && miniPdp.values[0][0] === 'Default Title');
    var first = product.variants.filter(function (v) { return v.available; })[0] || product.variants[0];
    miniPdp.selected = miniPdp.names.map(function (_, i) {
      return hasRealOptions ? (first ? first.options[i] : null) : first.options[i];
    });

    var optionsHtml = '';
    if (hasRealOptions) {
      optionsHtml = '<div class="mini-pdp__options">' + miniPdp.names.map(function (name, i) {
        return '<div class="mini-pdp__option"><span class="mini-pdp__option-label">' + name + '</span><div class="mini-pdp__values">' +
          miniPdp.values[i].map(function (val) {
            return '<button type="button" class="mini-pdp__value" data-minipdp-value data-option-index="' + i +
              '" data-option-value="' + String(val).replace(/"/g, '&quot;') + '" aria-pressed="false">' + val + '</button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    }

    body.innerHTML =
      '<div class="mini-pdp__top">' +
        '<span class="mini-pdp__media"><img data-minipdp-image src="' + (product.featured_image || '') + '" alt=""></span>' +
        '<span><h3 class="mini-pdp__title">' + product.title + '</h3>' +
        '<span class="mini-pdp__price" data-minipdp-price></span></span>' +
      '</div>' + optionsHtml +
      '<button type="button" class="btn btn--solid btn--full mini-pdp__add" data-minipdp-add data-card-add data-label-add="' +
        'add to bag" data-variant-id=""><span data-minipdp-add-text>add to bag</span></button>';

    root.hidden = false;
    miniUpdate();
  }

  document.addEventListener('click', function (e) {
    var arrow = e.target.closest('[data-addon-prev], [data-addon-next]');
    if (arrow) {
      var track = qs('[data-addon-track]');
      if (!track) return;
      var card = qs('.cart-addon-card', track);
      var step = card ? card.offsetWidth + 10 : 120;
      track.scrollBy({ left: arrow.hasAttribute('data-addon-next') ? step : -step, behavior: 'smooth' });
      return;
    }

    if (e.target.closest('[data-minipdp-close]')) { closeMiniPdp(); return; }

    var value = e.target.closest('[data-minipdp-value]');
    if (value) {
      miniPdp.selected[parseInt(value.getAttribute('data-option-index'), 10)] = value.getAttribute('data-option-value');
      miniUpdate();
      return;
    }

    var cardBtn = e.target.closest('[data-addon-handle]');
    if (cardBtn) {
      e.preventDefault();
      if (!window.fetch) { window.location.href = '/products/' + cardBtn.getAttribute('data-addon-handle'); return; }
      fetch('/products/' + cardBtn.getAttribute('data-addon-handle') + '.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('unavailable'); return r.json(); })
        .then(renderMiniPdp)
        .catch(function () { window.location.href = '/products/' + cardBtn.getAttribute('data-addon-handle'); });
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMiniPdp();
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

  /* The drawer is re-rendered server side on every cart change, so the fill is
     animated from the last known value to the new one rather than snapping. */
  var lastCartProgress = null;
  function animateCartProgress() {
    var veil = qs('[data-cart-progress]');
    if (!veil) return;
    var target = parseFloat(veil.getAttribute('data-progress')) || 0;
    var from = lastCartProgress === null ? target : lastCartProgress;
    veil.style.left = from + '%';
    void veil.offsetWidth;
    veil.style.left = target + '%';
    lastCartProgress = target;
  }
  animateCartProgress();

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
        animateCartProgress();
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
