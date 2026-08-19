/* Shared, RLS-backed customer favourites operations. */
(function () {
  'use strict';

  function login() {
    window.location.assign((window.NGD_SITE_ROOT || './') + 'login.html');
  }

  async function user(redirect) {
    var current = window.NGDAuth && await window.NGDAuth.getCurrentUser();
    if (!current && redirect) login();
    return current;
  }

  function productColumn(type) {
    return type === 'diamond' ? 'diamond_id' : 'jewellery_id';
  }

  async function find(type, productId) {
    var current = await user(false);
    if (!current) return null;
    var result = await window.ngdSupabase.from('favourites').select('id')
      .eq('user_id', current.id).eq('product_type', type)
      .eq(productColumn(type), productId).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }

  async function add(type, productId) {
    var current = await user(true);
    if (!current) return null;
    var row = { user_id: current.id, product_type: type };
    row[productColumn(type)] = productId;
    var result = await window.ngdSupabase.from('favourites').insert(row)
      .select('id').maybeSingle();
    // The database's unique indexes are the final duplicate guard. A
    // simultaneous save in another tab therefore resolves to the existing row.
    if (result.error && result.error.code !== '23505') throw result.error;
    return result.data || await find(type, productId);
  }

  async function remove(type, productId) {
    var current = await user(true);
    if (!current) return false;
    var result = await window.ngdSupabase.from('favourites').delete()
      .eq('user_id', current.id).eq('product_type', type)
      .eq(productColumn(type), productId);
    if (result.error) throw result.error;
    return true;
  }

  async function bind(buttons, type, productId, label) {
    var active = !!(await find(type, productId));
    var busy = false;
    function render() {
      buttons.forEach(function (button) {
        if (!button) return;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        button.disabled = busy;
        var icon = button.querySelector('.ngd-fav-icon');
        if (icon) icon.textContent = active ? '♥' : '♡';
      });
      if (label) label.textContent = active ? 'Saved' : 'Add to Favourites';
    }
    render();
    buttons.forEach(function (button) {
      if (!button) return;
      button.addEventListener('click', async function () {
        if (busy) return;
        busy = true; render();
        try {
          if (active) {
            await remove(type, productId);
            active = false;
          } else if (await add(type, productId)) {
            active = true;
          }
        } catch (error) {
          console.error('[NGD Favourites]', error);
        } finally { busy = false; render(); }
      });
    });
  }

  window.NGDFavourites = { find: find, add: add, remove: remove, bind: bind };
})();
