/**
 * UI module
 * ---------
 * Owns the slide-up info card shared by POIs and sponsors, plus small
 * helpers (status text, presence count).
 */

const el = (id) => document.getElementById(id);

const card = el('card');
const scrim = el('card-scrim');

export function initUI() {
  el('card-close').addEventListener('click', closeCard);
  scrim.addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCard();
  });
}

export function setStatus(text, autoHide = false) {
  const s = el('status');
  s.textContent = text;
  s.classList.remove('hidden');
  if (autoHide) {
    clearTimeout(s._t);
    s._t = setTimeout(() => s.classList.add('hidden'), 3500);
  }
}

export function setPresence(count) {
  el('presence-count').textContent = count;
}

const NAME_KEY = 'rosy:name';

export function getStoredName() {
  try { return sessionStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

/**
 * Resolve the player's display name. If one is already stored for the session,
 * returns it immediately. Otherwise shows a small modal asking for one (falling
 * back to `suggested` if left blank) and persists it for the session.
 * @param {string} suggested
 * @returns {Promise<string>}
 */
export function promptDisplayName(suggested = 'Guest') {
  const existing = getStoredName();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const modal = el('name-modal');
    const input = el('name-input');
    const form = el('name-form');
    input.value = suggested;
    modal.hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 50);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (input.value.trim() || suggested).slice(0, 24);
      try { sessionStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
      modal.hidden = true;
      resolve(name);
    }, { once: true });
  });
}

/**
 * Ask the user, up front, whether Rosy may use their location. Resolves to
 * `true` (use my location) or `false` (not now — run on a demo location). This
 * is our own explainer shown BEFORE the OS permission dialog, and it also lets
 * the user decline while still using the app.
 * @returns {Promise<boolean>}
 */
export function promptLocationConsent() {
  return new Promise((resolve) => {
    const modal = el('loc-modal');
    const allow = el('loc-allow');
    const deny = el('loc-deny');
    modal.hidden = false;
    const done = (val) => { modal.hidden = true; resolve(val); };
    allow.addEventListener('click', () => done(true), { once: true });
    deny.addEventListener('click', () => done(false), { once: true });
  });
}

/**
 * Render + open the info card.
 * @param {object} item
 *   { kind: 'poi'|'sponsor', name, photo, description, directionsUrl,
 *     badge, offer, menu:[{name,price}], address }
 */
export function openCard(item) {
  const media = el('card-media');
  if (item.photo) {
    media.style.backgroundImage = `url("${item.photo}")`;
    media.classList.remove('empty');
  } else {
    media.style.backgroundImage = '';
    media.classList.add('empty');
  }

  const badge = el('card-badge');
  badge.textContent = item.badge || (item.kind === 'sponsor' ? 'Sponsored' : 'Point of Interest');
  badge.classList.toggle('sponsor', item.kind === 'sponsor');

  el('card-title').textContent = item.name || '';
  el('card-desc').textContent = item.description || '';

  // Extra content: offers + menu for sponsors.
  const extra = el('card-extra');
  extra.innerHTML = '';
  if (item.offer) {
    const o = document.createElement('div');
    o.className = 'offer';
    o.innerHTML = `<b>Offer:</b> ${escapeHtml(item.offer)}`;
    extra.appendChild(o);
  }
  if (Array.isArray(item.menu) && item.menu.length) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p class="menu-title">Menu</p>`;
    const ul = document.createElement('ul');
    ul.className = 'menu-list';
    item.menu.forEach((m) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(m.name)}</span><span class="price">${escapeHtml(m.price || '')}</span>`;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    extra.appendChild(wrap);
  }
  if (item.address) {
    const a = document.createElement('p');
    a.className = 'card-desc';
    a.style.fontSize = '13px';
    a.textContent = `📍 ${item.address}`;
    extra.appendChild(a);
  }

  const dir = el('card-directions');
  dir.href = item.directionsUrl || '#';

  card.classList.add('open');
  card.setAttribute('aria-hidden', 'false');
  scrim.hidden = false;
}

export function closeCard() {
  card.classList.remove('open');
  card.setAttribute('aria-hidden', 'true');
  scrim.hidden = true;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
