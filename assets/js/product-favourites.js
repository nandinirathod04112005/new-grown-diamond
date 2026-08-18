/* Shared live favourite button controller for public product detail pages. */
(function () {
  'use strict';

  function loginUrl() {
    return (window.NGD_SITE_ROOT || './') + 'login.html';
  }

  function setButtons(buttons, saved, busy) {
    buttons.forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !!busy;
      btn.classList.toggle('is-active', saved);
      btn.setAttribute('aria-pressed', String(saved));
      btn.setAttribute('aria-label', saved ? 'Saved' : 'Add to favourites');
      var icon = btn.querySelector('.ngd-fav-icon');
      if (icon) icon.textContent = saved ? '♥' : '♡';
    });
  }

  async function resolveProductId(sb, type, product) {
    if (product.uuid) return product.uuid;
    var table = type === 'diamond' ? 'diamonds' : 'jewellery';
    var publicColumn = type === 'diamond' ? 'stock_number' : 'sku';
    var publicValue = product.id || product.stock_number || product.sku;
    var result = await sb.from(table).select('id').eq(publicColumn, publicValue).maybeSingle();
    if (result.error) throw result.error;
    return result.data && result.data.id;
  }

  window.NGDFavourites = {
    bind: async function (options) {
      var sb = window.ngdSupabase;
      var buttons = options.buttons.filter(Boolean);
      var saved = false;
      var user = null;
      var productId = null;
      var idColumn = options.type === 'diamond' ? 'diamond_id' : 'jewellery_id';

      function render(busy) {
        setButtons(buttons, saved, busy);
        if (options.label) options.label.textContent = saved ? 'Saved' : 'Add to Favourites';
      }
      render(false);
      if (!sb) return;

      var sessionResult = await sb.auth.getSession();
      user = sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
      if (user) {
        try {
          productId = await resolveProductId(sb, options.type, options.product);
          if (productId) {
            var existing = await sb.from('favourites').select('id')
              .eq('user_id', user.id).eq(idColumn, productId).maybeSingle();
            if (existing.error) throw existing.error;
            saved = !!existing.data;
            render(false);
          }
        } catch (error) {
          console.error('[NGD Favourites] Could not load saved state:', error);
        }
      }

      buttons.forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!user) {
            window.location.assign(loginUrl());
            return;
          }
          if (saved) return;
          render(true);
          try {
            productId = productId || await resolveProductId(sb, options.type, options.product);
            if (!productId) throw new Error('This product is not available in the live catalogue.');
            var row = { user_id: user.id, product_type: options.type };
            row[idColumn] = productId;
            var inserted = await sb.from('favourites').insert(row);
            /* The unique database index is the final duplicate guard. */
            if (inserted.error && inserted.error.code !== '23505') throw inserted.error;
            saved = true;
          } catch (error) {
            console.error('[NGD Favourites] Save failed:', error);
          }
          render(false);
        });
      });
    }
  };
})();
