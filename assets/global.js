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
        /* the sheet opened from the floating bar gets out of the way so the
           drawer it just refreshed is visible. The drawer's own mini PDP is
           left exactly as it was. */
        var sheet = button.closest('#mini-pdp');
        if (sheet && sheet.classList.contains('mini-pdp--standalone')) closeMiniPdp();
        return drawerEnabled ? refreshCartDrawer(true) : updateCartCount();
      })
      .catch(function (err) {
        button.classList.remove('is-busy');
        alert(err.message || 'could not add to bag');
      });
  });

  /* ---------- desktop product gallery (1 + 2 grid + carousel) ---------- */

  /* Desktop shows three shots on the grid and keeps the rest in the carousel;
     mobile keeps its single stage, so every branch here is gated on the media
     query. One ordered list of media ids drives both: entries 0-2 are the grid,
     the remainder is the carousel, and every interaction is a swap inside that
     list -- which is what leaves IMG 2 and IMG 3 untouched when a carousel shot
     is promoted. A colour change replaces the list outright. */
  var desktopGallery = window.matchMedia('(min-width: 900px)');
  var galleries = [];

  function buildGallery(root) {
    var scope = root.closest('.product-page') || document;
    var items = qsa('[data-gallery-item]', scope);
    var thumbsWrap = qs('.product-thumbs-wrap', scope);
    var allIds = items.map(function (el) { return el.getAttribute('data-media-id'); });

    var groups = {};
    var groupsEl = qs('[data-media-groups]', scope);
    if (groupsEl) {
      try { groups = JSON.parse(groupsEl.textContent) || {}; } catch (err) { groups = {}; }
    }

    /* `limit` is how many slots the grid claims -- three, or fewer when the
       selected colour has fewer shots, which is what keeps a short colour from
       borrowing a third image off the next one. */
    var api = { scope: scope, order: allIds.slice(), limit: Math.min(3, allIds.length) || 1 };

    function apply() {
      var shown = api.order.slice(0, api.limit);
      items.forEach(function (el) {
        var i = shown.indexOf(el.getAttribute('data-media-id'));
        if (i === -1) el.removeAttribute('data-slot');
        else el.setAttribute('data-slot', String(i));
      });
      /* the carousel is what is left of the current ordering, so once a colour
         is chosen it holds that colour's remaining shots and nothing from the
         colour before it */
      qsa('[data-gallery-thumb]', scope).forEach(function (t) {
        var id = t.getAttribute('data-media-id');
        if (shown.indexOf(id) === -1 && api.order.indexOf(id) !== -1) t.removeAttribute('data-thumb-hidden');
        else t.setAttribute('data-thumb-hidden', '');
      });
      root.setAttribute('data-slots', String(shown.length || 1));
      if (thumbsWrap) {
        if (api.order.length > shown.length) thumbsWrap.removeAttribute('data-thumbs-empty');
        else thumbsWrap.setAttribute('data-thumbs-empty', '');
      }
    }

    /* promoting swaps with the primary, so whatever was IMG 1 takes the
       promoted shot's old place instead of disappearing */
    api.promote = function (id) {
      var i = api.order.indexOf(id);
      if (i < 1) return;
      var head = api.order[0];
      api.order[0] = api.order[i];
      api.order[i] = head;
      apply();
    };

    /* The chosen variant's own media is IMG 1 -- Shopify's real variant-to-media
       relationship, handed in by the picker, with the section's own mapping as
       the fallback for a product JSON that carries no featured_media. The rest
       of that colour's shots follow it, and nothing else is in the ordering at
       all, so no thumbnail from the colour before is left behind.

       A colour whose variants point at no media has none of its own, and there
       the product's default set is the honest answer. */
    api.setVariant = function (value, variantMediaId) {
      var key = String(value == null ? '' : value).toLowerCase().trim();
      var group = groups[key];
      var owned = group && group.media ? group.media.map(String) : [];

      var primary = variantMediaId != null && variantMediaId !== ''
        ? String(variantMediaId)
        : (group && group.primary ? String(group.primary) : null);
      if (primary && allIds.indexOf(primary) !== -1) {
        owned = [primary].concat(owned.filter(function (id) { return id !== primary; }));
      }
      owned = owned.filter(function (id) { return allIds.indexOf(id) !== -1; });

      api.order = owned.length ? owned : allIds.slice();
      api.limit = Math.min(3, api.order.length) || 1;
      apply();
    };

    apply();
    return api;
  }

  function galleryFor(node) {
    var scope = node && node.closest ? node.closest('.product-page') : null;
    if (!scope) return null;
    for (var i = 0; i < galleries.length; i++) {
      if (galleries[i].scope === scope) return galleries[i];
    }
    return null;
  }

  qsa('[data-gallery-grid]').forEach(function (root) { galleries.push(buildGallery(root)); });

  /* clicking IMG 2 or IMG 3 makes it the primary */
  document.addEventListener('click', function (e) {
    if (!desktopGallery.matches) return;
    var item = e.target.closest('[data-gallery-item]');
    if (!item || !item.hasAttribute('data-slot')) return;
    if (item.getAttribute('data-media-type') !== 'image') return;
    var gallery = galleryFor(item);
    if (gallery) gallery.promote(item.getAttribute('data-media-id'));
  });

  /* ---------- product gallery thumbnails ---------- */

  document.addEventListener('click', function (e) {
    var arrow = e.target.closest('[data-thumbs-prev], [data-thumbs-next]');
    if (!arrow) return;
    var track = qs('[data-thumbs-track]', arrow.closest('.product-thumbs-wrap') || document);
    if (!track) return;
    var first = qs('.product-thumb', track);
    var step = (first ? first.offsetWidth + 8 : 82) * 2;
    track.scrollBy({ left: arrow.hasAttribute('data-thumbs-next') ? step : -step, behavior: 'smooth' });
  });

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

    /* desktop additionally moves it into IMG 1, leaving IMG 2 and 3 where they are */
    if (desktopGallery.matches) {
      var gallery = galleryFor(thumb);
      if (gallery) gallery.promote(id);
    }
  });

  /* ---------- add-on carousel + mini product sheet ---------- */

  var miniPdp = { product: null, names: [], values: [], selected: [] };

  /* Where the sheet lives when it is the drawer's. The drawer panel is
     transform: translateX(100%) while closed, and a transform makes an element
     the containing block for position: fixed inside it -- so a sheet opened
     from the page would be laid out against the closed, off-screen panel. It
     is lifted to the body for that, and put back on close. */
  var miniPdpHome = null;

  function liftMiniPdp(root) {
    if (miniPdpHome || root.parentNode === document.body) return;
    miniPdpHome = { parent: root.parentNode, next: root.nextSibling };
    document.body.appendChild(root);
  }

  function returnMiniPdp(root) {
    if (!miniPdpHome) return;
    /* a cart refresh rebuilds the drawer, and with it its own copy of the
       sheet -- so this one is dropped rather than put back as a duplicate */
    if (miniPdpHome.parent && miniPdpHome.parent.isConnected) {
      miniPdpHome.parent.insertBefore(root, miniPdpHome.next);
    } else if (root.parentNode === document.body) {
      root.remove();
    }
    miniPdpHome = null;
  }

  function miniMoney(cents) {
    var root = qs('#mini-pdp');
    var fmt = (root && root.getAttribute('data-money-format')) || '${{amount}}';
    return fmt.replace(/\{\{\s*amount[^}]*\}\}/, (cents / 100).toFixed(2));
  }

  function closeMiniPdp() {
    var root = qs('#mini-pdp');
    if (!root) return;
    root.hidden = true;
    root.classList.remove('mini-pdp--standalone');
    returnMiniPdp(root);
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

    /* The shot follows the variant once the customer has picked something. With
       nothing picked the product's own image stays, which is what lets the
       sheet open without a variant chosen. Always true for the drawer's
       add-ons, where every option arrives preselected. */
    var anyChosen = miniPdp.selected.some(function (v) { return v !== null; });
    var allChosen = miniPdp.selected.every(function (v) { return v !== null; });

    var imgEl = qs('[data-minipdp-image]');
    if (imgEl && anyChosen && variant && variant.featured_image && variant.featured_image.src) {
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
      var ready = variant && variant.available && allChosen;
      addBtn.disabled = !ready;
      /* no variant id until the choice is complete, so a half-made selection
         can never be added */
      addBtn.setAttribute('data-variant-id', ready ? variant.id : '');
      var label = qs('[data-minipdp-add-text]', addBtn);
      if (label) {
        label.textContent = !allChosen ? (addBtn.getAttribute('data-label-choose') || 'choose options')
          : (!variant ? 'unavailable'
          : (!variant.available ? 'sold out' : (addBtn.getAttribute('data-label-add') || 'add to bag')));
      }
    }
  }

  /* options.preselect: the choices to open with, an entry per option and null
     for "not chosen". options.standalone: promote the sheet to the viewport,
     for when there is no drawer panel around it. Both omitted -- which is how
     the drawer's add-ons call it -- leaves the original behaviour untouched. */
  function renderMiniPdp(product, options) {
    options = options || {};
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
      if (!hasRealOptions) return first.options[i];
      if (options.preselect) return options.preselect[i] == null ? null : options.preselect[i];
      return first ? first.options[i] : null;
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
        'add to bag" data-label-choose="choose options" data-variant-id=""><span data-minipdp-add-text>add to bag</span></button>';

    if (options.standalone) liftMiniPdp(root);
    else returnMiniPdp(root);
    root.classList.toggle('mini-pdp--standalone', !!options.standalone);
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

  /* ---------- floating PDP product bar ---------- */

  /* Watches the buy controls rather than the button itself: the pre-order swap
     takes the button out of the flow entirely, and an element that is not
     rendered never intersects, which would pin the bar open. A 0.2 threshold
     gives the hysteresis that stops it flickering at the boundary. */
  (function () {
    var bar = qs('[data-pdp-bar]');
    var buyArea = qs('[data-buy-observe]');
    if (!bar || !buyArea || !window.IntersectionObserver) return;
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { threshold: 0.2 }).observe(buyArea);
  })();

  /* The + opens the cart drawer's mini PDP on this product, carrying whatever
     the customer has already chosen on the page -- which is nothing at all on
     arrival, so the sheet opens unchosen too. No fetch: the section already
     prints the product JSON. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-pdp-bar-add]')) return;
    var jsonEl = qs('[data-product-json]');
    if (!jsonEl) return;
    var product;
    try { product = JSON.parse(jsonEl.textContent); } catch (err) { return; }

    /* the sheet's markup wants a plain url here; the drawer's add-ons get one
       from /products/<handle>.js, so normalise rather than assume */
    if (typeof product.featured_image !== 'string') {
      var barImg = qs('[data-pdp-bar-image]');
      product.featured_image = (product.featured_image && product.featured_image.src) || (barImg ? barImg.src : '');
    }

    var preselect = qsa('[data-option-group]').map(function (group) {
      var checked = group.querySelector('input:checked');
      return checked ? checked.value : null;
    });

    renderMiniPdp(product, { preselect: preselect.length ? preselect : null, standalone: true });
  });

  /* ---------- variant picker ---------- */

  qsa('[data-product-form-wrapper]').forEach(function (wrapper) {
    var jsonEl = wrapper.querySelector('[data-product-json]');
    if (!jsonEl) return;
    var product;
    try { product = JSON.parse(jsonEl.textContent); } catch (err) { return; }

    /* a colour change resets the gallery to that colour's shots; a size change
       must leave it alone, so the last colour is tracked rather than reacting
       to every option change */
    var colorIndex = -1;
    (product.options || []).forEach(function (option, i) {
      var name = String(option && option.name ? option.name : option).toLowerCase();
      if (name.indexOf('color') !== -1 || name.indexOf('colour') !== -1) colorIndex = i;
    });

    var idInput = wrapper.querySelector('input[name="id"]');
    var priceEl = wrapper.querySelector('[data-price]');
    var barPrice = qs('[data-pdp-bar-price]');
    var barImage = qs('[data-pdp-bar-image]');

    /* The variant a colour stands for while the size is still open: that is
       what carries the featured_media the gallery has to show, so the shot
       changes on the colour click rather than waiting for a full selection.
       An in-stock one is preferred, since that is the one being offered. */
    function variantForColor(color) {
      var match = null;
      product.variants.forEach(function (v) {
        if (v.options[colorIndex] !== color) return;
        if (!match || (!match.available && v.available)) match = v;
      });
      return match;
    }

    function smallImage(src) {
      if (!src) return src;
      return src + (src.indexOf('?') === -1 ? '?' : '&') + 'width=160';
    }

    function showColor(color) {
      var representative = variantForColor(color);
      var mediaId = representative && representative.featured_media
        ? representative.featured_media.id
        : null;
      var gallery = galleryFor(wrapper);
      if (gallery) gallery.setVariant(color, mediaId);
      if (barImage && representative && representative.featured_image && representative.featured_image.src) {
        barImage.src = smallImage(representative.featured_image.src);
        barImage.removeAttribute('srcset');
      }
    }
    var buyBtn = wrapper.querySelector('[data-add-to-cart]');
    var buyText = wrapper.querySelector('[data-add-to-cart-text]');

    function money(cents) {
      var fmt = wrapper.getAttribute('data-money-format') || '${{amount}}';
      var amount = (cents / 100).toFixed(2);
      return fmt.replace(/\{\{\s*amount[^}]*\}\}/, amount);
    }

    /* the real option fieldsets only -- the quantity stepper shares the
       .option-group class and is not a variant option */
    var optionGroups = qsa('[data-option-group]', wrapper);

    function selectedOptions() {
      return optionGroups.map(function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    function allChosen(options) {
      return options.every(function (value) { return value !== null; });
    }

    function findVariant(options) {
      /* a product with no options has exactly one variant to find */
      if (!optionGroups.length) return product.variants[0];
      return product.variants.find(function (v) {
        return v.options.every(function (opt, i) { return opt === options[i]; });
      });
    }

    function update() {
      var options = selectedOptions();

      /* the gallery follows the colour only once one is actually picked, so an
         untouched page keeps the product's default media set */
      if (colorIndex >= 0) {
        var color = options[colorIndex];
        if (color && color !== lastColor) {
          lastColor = color;
          showColor(color);
        }
      }

      /* Nothing chosen yet is its own state: the button prompts for the
         options rather than claiming the product is unavailable, carries no
         variant id, and leaves the pre-order CTA alone. */
      if (!allChosen(options)) {
        if (idInput) idInput.value = '';
        if (buyBtn) {
          buyBtn.disabled = true;
          buyBtn.setAttribute('data-needs-options', '');
        }
        if (buyText) buyText.textContent = (buyBtn && buyBtn.getAttribute('data-label-choose')) || 'choose options';
        return;
      }
      if (buyBtn) buyBtn.removeAttribute('data-needs-options');

      var variant = findVariant(options);
      if (!variant) {
        if (idInput) idInput.value = '';
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
        if (barPrice) barPrice.innerHTML = html;
      }
      /* the bar follows the variant's own shot where it has one; a variant
         without its own image leaves the product's default in place */
      if (barImage && variant.featured_image && variant.featured_image.src) {
        barImage.src = smallImage(variant.featured_image.src);
        barImage.removeAttribute('srcset');
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

    /* Seed the gallery only when a colour is already selected -- a ?variant=
       link, say. With nothing chosen the gallery keeps the product's default
       media set, and a colour carrying fewer than three shots still never
       borrows one from the next colour once it is picked. */
    var lastColor = colorIndex >= 0 ? selectedOptions()[colorIndex] : null;
    if (lastColor) showColor(lastColor);

    wrapper.addEventListener('change', function (e) {
      if (e.target.closest('[data-option-group]')) update();
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
