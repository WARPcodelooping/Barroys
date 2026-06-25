import { useState, useEffect, useRef, Fragment } from 'react';
import {
  CATEGORY_TABS, CATEGORIES, PRODUCTS, DELIVERY, DEFAULT_SETTINGS,
  type Product, type Settings,
} from './data';

type ScreenId =
  | 'auth' | 'home' | 'item' | 'cart' | 'confirm' | 'profile'
  | 'admin-orders' | 'admin-products' | 'admin-profile';

type ShowFn = (id: ScreenId) => void;

interface CartLine { item: Product; qty: number; }
interface User { name: string; phone: string; }

type Method = 'pickup' | 'delivery';
interface OrderDetails {
  method: Method;
  address: string;
  whenText: string;
  comment: string;
}

type OrderStatus = 'sent' | 'accepted' | 'cooking' | 'ready' | 'done';
interface Order {
  num: string;
  lines: CartLine[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  date: string;
  ts: number;
  client: { name: string; phone: string };
  method: Method;
  address: string;
  whenText: string;
  comment: string;
}

export const ORDER_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'sent', label: 'Отправлен', icon: '📤' },
  { key: 'accepted', label: 'Принят', icon: '✓' },
  { key: 'cooking', label: 'Готовится', icon: '🔥' },
  { key: 'ready', label: 'Готово', icon: '📦' },
  { key: 'done', label: 'Выдан', icon: '✅' },
];

const USER_KEY = 'barroys_user';
const ORDER_SEQ_KEY = 'barroys_order_seq';
const ORDERS_KEY = 'barroys_orders';
const PRODUCTS_KEY = 'barroys_products';
const SETTINGS_KEY = 'barroys_settings';

function todayKey(): string {
  return new Date().toLocaleDateString('ru-RU');
}

// М = мобильный заказ. Нумерация сбрасывается каждый день: М01, М02, ...
function nextOrderNum(): string {
  let seq = 1;
  try {
    const raw = localStorage.getItem(ORDER_SEQ_KEY);
    const data = raw ? (JSON.parse(raw) as { date: string; seq: number }) : null;
    seq = data && data.date === todayKey() ? data.seq + 1 : 1;
    localStorage.setItem(ORDER_SEQ_KEY, JSON.stringify({ date: todayKey(), seq }));
  } catch {
    seq = 1;
  }
  return 'М' + String(seq).padStart(2, '0');
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadOrders(): Order[] {
  return loadJSON<Order[]>(ORDERS_KEY, []).filter(
    (o) => new Date(o.ts).toLocaleDateString('ru-RU') === todayKey(),
  );
}

function relativeTime(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  return `${Math.floor(min / 60)} ч назад`;
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

function isOpenNow(s: Settings): boolean {
  if (!s.open) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = s.workFrom.split(':').map(Number);
  const [th, tm] = s.workTo.split(':').map(Number);
  return fh * 60 + fm <= cur && cur < th * 60 + tm;
}

// Звук + вибрация при новом заказе (локально; настоящий пуш будет с бэкендом)
function notifyNewOrder() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.12;
    o.start(); o.stop(ctx.currentTime + 0.18);
  } catch { /* ignore */ }
  try { (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch { /* ignore */ }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadJSON<User | null>(USER_KEY, null));
  const [screen, setScreen] = useState<ScreenId>(() => (localStorage.getItem(USER_KEY) ? 'home' : 'auth'));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showReg, setShowReg] = useState(false);
  const [orders, setOrders] = useState<Order[]>(loadOrders);
  const [products, setProducts] = useState<Product[]>(() => loadJSON<Product[]>(PRODUCTS_KEY, PRODUCTS));
  const [settings, setSettings] = useState<Settings>(() => loadJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS));

  useEffect(() => { try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch { /* ignore */ } }, [orders]);
  useEffect(() => { try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)); } catch { /* ignore */ } }, [products]);
  useEffect(() => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }, [settings]);

  // Звук при появлении нового заказа
  const prevCount = useRef(orders.length);
  useEffect(() => {
    if (orders.length > prevCount.current && settings.notifyNew) notifyNewOrder();
    prevCount.current = orders.length;
  }, [orders.length, settings.notifyNew]);

  const currentOrder = orders.find((o) => o.status !== 'done') ?? null;
  const history = orders.filter((o) => o.status === 'done');

  const updateStatus = (num: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.num === num ? { ...o, status } : o)));
  };

  const show = (id: ScreenId) => setScreen(id);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const itemsTotal = cart.reduce((s, l) => s + l.qty * l.item.price, 0);

  const addToCart = (item: Product, n = 1) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.item.id === item.id);
      if (ex) return prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + n } : l));
      return [...prev, { item, qty: n }];
    });
  };
  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((l) => (l.item.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  };
  const qtyOf = (id: string) => cart.find((l) => l.item.id === id)?.qty ?? 0;

  const onLogin = () => { if (user) { show('home'); return; } setShowReg(true); };
  const onRegister = (u: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u); setShowReg(false); show('home');
  };

  const checkout = (d: OrderDetails) => {
    if (cart.length === 0) return;
    const now = Date.now();
    const deliveryFee = d.method === 'delivery' && itemsTotal < DELIVERY.freeFrom ? DELIVERY.fee : 0;
    const order: Order = {
      num: nextOrderNum(),
      lines: cart,
      itemsTotal,
      deliveryFee,
      total: itemsTotal + deliveryFee,
      status: 'sent',
      ts: now,
      client: { name: user?.name ?? 'Гость', phone: user?.phone ?? '' },
      method: d.method,
      address: d.address,
      whenText: d.whenText,
      comment: d.comment,
      date: new Date(now).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) +
        ', ' + new Date(now).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    show('confirm');
  };

  // Повторить заказ из истории
  const repeatOrder = (o: Order) => {
    setCart(o.lines.map((l) => ({ item: l.item, qty: l.qty })));
    show('cart');
  };

  const openItem = (item: Product) => { setSelected(item); show('item'); };

  const isAdmin = screen.startsWith('admin-');
  const open = isOpenNow(settings);

  return (
    <div className="phone">
      <button className="role-toggle" onClick={() => show(isAdmin ? 'home' : 'admin-orders')}>
        {isAdmin ? '👤 Клиент' : '⚙️ Админ'}
      </button>

      <AuthScreen active={screen === 'auth'} onLogin={onLogin} />
      <HomeScreen
        active={screen === 'home'} show={show} products={products}
        addToCart={addToCart} openItem={openItem}
        cartCount={cartCount} cartTotal={itemsTotal} open={open} workTo={settings.workTo}
      />
      <ItemScreen active={screen === 'item'} show={show} item={selected} qty={selected ? qtyOf(selected.id) : 0} addToCart={addToCart} />
      <CartScreen active={screen === 'cart'} show={show} cart={cart} itemsTotal={itemsTotal} changeQty={changeQty} checkout={checkout} />
      <ConfirmScreen active={screen === 'confirm'} show={show} order={currentOrder} />
      <ProfileScreen active={screen === 'profile'} show={show} user={user} order={currentOrder} history={history} repeatOrder={repeatOrder} />
      <AdminOrdersScreen active={screen === 'admin-orders'} show={show} orders={orders} updateStatus={updateStatus} />
      <AdminProductsScreen active={screen === 'admin-products'} show={show} products={products} setProducts={setProducts} />
      <AdminProfileScreen active={screen === 'admin-profile'} show={show} settings={settings} setSettings={setSettings} orders={orders} />

      {showReg && <RegisterModal onSubmit={onRegister} onClose={() => setShowReg(false)} />}
    </div>
  );
}

function screenClass(active: boolean) {
  return 'screen' + (active ? ' active' : '');
}

/* ══ REGISTER MODAL ══ */
function RegisterModal({ onSubmit, onClose }: { onSubmit: (u: User) => void; onClose: () => void }) {
  const tg = (window as any)?.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const [name, setName] = useState<string>(tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '');
  const [phone, setPhone] = useState('');

  const shareViaTelegram = () => {
    if (tg?.requestContact) {
      tg.requestContact((ok: boolean, res: any) => {
        const p = res?.responseUnsafe?.contact?.phone_number;
        if (ok && p) setPhone(p);
      });
    }
  };

  const valid = name.trim().length >= 2 && phone.trim().length >= 6;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-emoji">🍔</div>
        <div className="modal-title">ДОБРО ПОЖАЛОВАТЬ</div>
        <div className="modal-sub">Заполните данные — это нужно только один раз</div>

        <label className="modal-label">Имя</label>
        <input className="modal-input" placeholder="Как вас зовут?" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="modal-label">Телефон</label>
        <input className="modal-input" placeholder="+7 (___) ___-__-__" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {tg?.requestContact && (
          <button className="modal-tg-share" onClick={shareViaTelegram}>📱 Взять номер из Telegram</button>
        )}

        <button className="modal-submit" disabled={!valid} onClick={() => onSubmit({ name: name.trim(), phone: phone.trim() })}>
          Продолжить
        </button>
      </div>
    </div>
  );
}

/* ══ AUTH ══ */
function AuthScreen({ active, onLogin }: { active: boolean; onLogin: () => void }) {
  return (
    <div className={screenClass(active)}>
      <div className="auth-screen">
        <div className="auth-glow" />
        <div className="auth-logo">БАРР<span>🍔</span>ЙС<br />БУРГЕР</div>
        <div className="auth-tagline">Мясо. Огонь. Вкус.</div>
        <div className="auth-burger-emoji">🔥</div>
        <div className="auth-desc">Войдите чтобы сделать заказ.<br /><strong>Номер телефона возьмём из Telegram</strong> — одна кнопка, без лишних шагов.</div>
        <button className="tg-btn" onClick={onLogin}>
          <span className="tg-icon">📱</span>
          Войти через Telegram
        </button>
      </div>
    </div>
  );
}

/* ══ HOME / CATALOG ══ */
function HomeScreen({ active, show, products, addToCart, openItem, cartCount, cartTotal, open, workTo }: {
  active: boolean; show: ShowFn; products: Product[];
  addToCart: (i: Product) => void; openItem: (i: Product) => void;
  cartCount: number; cartTotal: number; open: boolean; workTo: string;
}) {
  const [tab, setTab] = useState(0);
  const sections = CATEGORIES.map((c) => ({ ...c, items: products.filter((p) => p.cat === c.id) }))
    .filter((s) => s.items.length > 0);

  const goCategory = (i: number) => {
    setTab(i);
    const el = document.getElementById(CATEGORIES[i].id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={screenClass(active)}>
      <div className="home-header">
        <div className="home-topbar">
          <div className="home-logo">БАРР<span>🍔</span>ЙС</div>
          <div className={'open-badge ' + (open ? 'open' : 'closed')}>
            <div className="dot" />{open ? `Открыто до ${workTo}` : 'Закрыто'}
          </div>
        </div>
      </div>
      <div className="cat-tabs">
        {CATEGORY_TABS.map((t, i) => (
          <div key={t} className={'cat-tab' + (tab === i ? ' active' : '')} onClick={() => goCategory(i)}>{t}</div>
        ))}
      </div>
      <div className="scroll-body" style={{ paddingBottom: cartCount > 0 ? 80 : 16 }}>
        {sections.map((section) => (
          <div className="menu-section" id={section.id} key={section.id}>
            <div className="menu-section-title">{section.title}</div>
            <div className="menu-items">
              {section.items.map((it) => (
                <div className="menu-item" key={it.id} onClick={() => openItem(it)}>
                  <div className="menu-item-img">{it.emoji}</div>
                  <div className="menu-item-info">
                    <div>
                      <div className="menu-item-name">{it.name}</div>
                      <div className="menu-item-desc">{it.desc}</div>
                    </div>
                    <div className="menu-item-bottom">
                      <div className="menu-item-price">{it.price} ₽</div>
                      <button className="add-btn" onClick={(e) => { e.stopPropagation(); addToCart(it); }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => show('cart')}>
          🛒 Корзина
          <div className="cart-count">{cartCount}</div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>· {fmt(cartTotal)} ₽</span>
        </button>
      )}
      <div className="bottom-nav">
        <div className="nav-item active" onClick={() => show('home')}>
          <div className="nav-icon">🍔</div><span>Меню</span><div className="nav-dot" />
        </div>
        <div className="nav-item" onClick={() => show('cart')}>
          <div className="nav-icon">🛒</div><span>Корзина</span>
        </div>
        <div className="nav-item" onClick={() => show('profile')}>
          <div className="nav-icon">👤</div><span>Профиль</span>
        </div>
      </div>
    </div>
  );
}

/* ══ ITEM DETAIL ══ */
function ItemScreen({ active, show, item, qty, addToCart }: {
  active: boolean; show: ShowFn; item: Product | null; qty: number; addToCart: (i: Product, n: number) => void;
}) {
  const [n, setN] = useState(1);
  useEffect(() => { setN(1); }, [item]);
  if (!item) return <div className={screenClass(active)} />;

  return (
    <div className={screenClass(active)}>
      <div className="item-hero">
        <button className="back-btn" onClick={() => show('home')}>←</button>
        {item.emoji}
      </div>
      <div className="item-body">
        <div className="item-name">{item.name.toUpperCase()}</div>
        <div className="item-price-big">{item.price} <span>₽</span></div>
        <div className="item-section-label">Состав</div>
        <div className="item-ingredients">{item.desc}</div>
        <div className="qty-row">
          <button className="qty-btn" onClick={() => setN((v) => Math.max(1, v - 1))}>−</button>
          <span className="qty-num">{n}</span>
          <button className="qty-btn" onClick={() => setN((v) => v + 1)}>+</button>
          <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>
            × {item.price} ₽ = <strong style={{ color: 'var(--text)' }}>{fmt(item.price * n)} ₽</strong>
          </span>
        </div>
        {qty > 0 && <div className="item-incart">В корзине: {qty} шт</div>}
        <button className="add-to-cart-btn" onClick={() => { addToCart(item, n); show('home'); }}>
          🛒 Добавить в корзину
        </button>
      </div>
    </div>
  );
}

/* ══ CART ══ */
function CartScreen({ active, show, cart, itemsTotal, changeQty, checkout }: {
  active: boolean; show: ShowFn; cart: CartLine[]; itemsTotal: number;
  changeQty: (id: string, delta: number) => void; checkout: (d: OrderDetails) => void;
}) {
  const [method, setMethod] = useState<Method>('pickup');
  const [address, setAddress] = useState('');
  const [asap, setAsap] = useState(true);
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');

  const empty = cart.length === 0;
  const deliveryFee = method === 'delivery' && itemsTotal < DELIVERY.freeFrom ? DELIVERY.fee : 0;
  const total = itemsTotal + deliveryFee;
  const belowMin = itemsTotal < DELIVERY.minOrder;
  const toFree = DELIVERY.freeFrom - itemsTotal;
  const addressOk = method === 'pickup' || address.trim().length >= 5;
  const canPay = !empty && !belowMin && addressOk;

  const onPay = () => {
    checkout({
      method,
      address: method === 'delivery' ? address.trim() : '',
      whenText: asap ? 'Как можно скорее' : (time ? `Ко времени ${time}` : 'Ко времени'),
      comment: comment.trim(),
    });
  };

  return (
    <div className={screenClass(active)}>
      <div className="cart-header">
        <div className="cart-title">КОРЗИНА</div>
      </div>
      <div className="scroll-body">
        {empty ? (
          <div className="cart-empty">
            <div className="cart-empty-emoji">🛒</div>
            <div className="cart-empty-title">Корзина пуста</div>
            <div className="cart-empty-sub">Добавьте что-нибудь вкусное из меню</div>
            <button className="cart-empty-btn" onClick={() => show('home')}>Перейти в меню</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((l) => (
                <div className="cart-item" key={l.item.id}>
                  <div className="cart-item-img">{l.item.emoji}</div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{l.item.name}</div>
                    <div className="cart-item-price">{fmt(l.item.price * l.qty)} ₽</div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="ci-btn" onClick={() => changeQty(l.item.id, -1)}>−</button>
                    <span className="ci-qty">{l.qty}</span>
                    <button className="ci-btn" onClick={() => changeQty(l.item.id, +1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Способ получения */}
            <div className="cart-section-label">Способ получения</div>
            <div className="seg">
              <button className={'seg-btn' + (method === 'pickup' ? ' active' : '')} onClick={() => setMethod('pickup')}>🏃 Самовывоз</button>
              <button className={'seg-btn' + (method === 'delivery' ? ' active' : '')} onClick={() => setMethod('delivery')}>🛵 Доставка</button>
            </div>
            {method === 'delivery' && (
              <input className="cart-input" placeholder="Адрес доставки (улица, дом, кв.)" value={address} onChange={(e) => setAddress(e.target.value)} />
            )}

            {/* Время */}
            <div className="cart-section-label">Когда</div>
            <div className="seg">
              <button className={'seg-btn' + (asap ? ' active' : '')} onClick={() => setAsap(true)}>⚡ Как можно скорее</button>
              <button className={'seg-btn' + (!asap ? ' active' : '')} onClick={() => setAsap(false)}>🕐 Ко времени</button>
            </div>
            {!asap && (
              <input className="cart-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            )}

            {/* Комментарий */}
            <div className="cart-section-label">Комментарий к заказу</div>
            <textarea className="cart-textarea" placeholder="Например: без лука, соус отдельно, поострее 🌶" value={comment} onChange={(e) => setComment(e.target.value)} />

            {/* Прогресс до бесплатной доставки */}
            {method === 'delivery' && toFree > 0 && (
              <div className="free-hint">До бесплатной доставки ещё <strong>{fmt(toFree)} ₽</strong></div>
            )}

            <div className="divider" />
            <div className="cart-total-row"><span className="cart-total-label">Товары</span><span className="cart-total-val">{fmt(itemsTotal)} ₽</span></div>
            {method === 'delivery' && (
              <div className="cart-total-row">
                <span className="cart-total-label">Доставка</span>
                <span className="cart-total-val">{deliveryFee === 0 ? 'бесплатно' : fmt(deliveryFee) + ' ₽'}</span>
              </div>
            )}
            <div className="cart-total-row big"><span className="cart-total-label">Итого</span><span className="cart-total-val">{fmt(total)} ₽</span></div>

            {belowMin && <div className="min-hint">Минимальный заказ — {fmt(DELIVERY.minOrder)} ₽</div>}
            {!addressOk && !belowMin && <div className="min-hint">Укажите адрес доставки</div>}

            <button className="pay-btn" disabled={!canPay} onClick={onPay}>💳 Оплатить {fmt(total)} ₽</button>
            <div style={{ height: 24 }} />
          </>
        )}
      </div>
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => show('home')}><div className="nav-icon">🍔</div><span>Меню</span></div>
        <div className="nav-item active"><div className="nav-icon">🛒</div><span>Корзина</span><div className="nav-dot" /></div>
        <div className="nav-item" onClick={() => show('profile')}><div className="nav-icon">👤</div><span>Профиль</span></div>
      </div>
    </div>
  );
}

/* ══ ORDER CONFIRMED ══ */
function ConfirmScreen({ active, show, order }: { active: boolean; show: ShowFn; order: Order | null }) {
  return (
    <div className={screenClass(active)}>
      <div className="confirm-screen">
        <div className="confirm-icon">✓</div>
        <div className="confirm-title">ЗАКАЗ ПРИНЯТ!</div>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', letterSpacing: '0.06em' }}>НОМЕР ЗАКАЗА</div>
        <div className="confirm-order-num">{order?.num ?? 'М—'}</div>
        <div className="confirm-desc">
          {order?.method === 'delivery' ? '🛵 Доставка' : '🏃 Самовывоз'}{order?.whenText ? ' · ' + order.whenText : ''}<br />
          Ваш заказ передан на кухню. Следите за статусом в профиле.
        </div>
        <button className="confirm-btn" onClick={() => show('profile')} style={{ background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, fontSize: 15 }}>Следить за заказом</button>
        <button className="confirm-btn" onClick={() => show('home')}>Вернуться в меню</button>
      </div>
    </div>
  );
}

/* ══ PROFILE (CLIENT) ══ */
function ProfileScreen({ active, show, user, order, history, repeatOrder }: {
  active: boolean; show: ShowFn; user: User | null; order: Order | null; history: Order[]; repeatOrder: (o: Order) => void;
}) {
  const name = user?.name || 'Гость';
  const phone = user?.phone || '';
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '🙂';
  const curIdx = order ? ORDER_STEPS.findIndex((s) => s.key === order.status) : -1;
  return (
    <div className={screenClass(active)}>
      <div className="profile-top">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{name}</div>
          <div className="profile-phone">{phone}</div>
        </div>
      </div>
      <div className="scroll-body">
        {order ? (
          <div className="current-order">
            <div className="co-header">
              <div className="co-title">Текущий заказ</div>
              <div className="co-num">{order.num}</div>
            </div>
            <div className="status-steps">
              {ORDER_STEPS.map((step, i) => (
                <Fragment key={step.key}>
                  {i > 0 && <div className={'step-line' + (i <= curIdx ? ' done' : '')} />}
                  <div className="step">
                    <div className={'step-circle' + (i < curIdx ? ' done' : i === curIdx ? ' active' : '')}>
                      {i < curIdx ? '✓' : step.icon}
                    </div>
                    <div className="step-label">{step.label}</div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div className="co-meta">{order.method === 'delivery' ? `🛵 Доставка: ${order.address || '—'}` : '🏃 Самовывоз'} · {order.whenText}</div>
            {order.comment && <div className="co-meta">💬 {order.comment}</div>}
            <div className="co-items">
              {order.lines.map((l) => (
                <div className="co-item" key={l.item.id}>
                  <span>{l.item.name} × {l.qty}</span>
                  <span>{fmt(l.item.price * l.qty)} ₽</span>
                </div>
              ))}
            </div>
            <div className="co-total">
              <span>Итого</span>
              <span>{fmt(order.total)} ₽</span>
            </div>
          </div>
        ) : (
          <div className="no-order">
            <div className="no-order-emoji">🍔</div>
            <div className="no-order-title">Нет активных заказов</div>
            <div className="no-order-sub">Сделайте заказ — он появится здесь</div>
            <button className="cart-empty-btn" onClick={() => show('home')}>Перейти в меню</button>
          </div>
        )}

        <div className="orders-history-title">История заказов</div>
        {history.length === 0 ? (
          <div className="history-empty">Пока пусто — здесь будут ваши прошлые заказы</div>
        ) : (
          <div className="history-items">
            {history.map((o) => (
              <div className="history-card" key={o.num}>
                <div className="hc-top"><span className="hc-num">{o.num}</span><span className="hc-date">{o.date}</span></div>
                <div className="hc-items">{o.lines.map((l) => `${l.item.name} × ${l.qty}`).join(', ')}</div>
                <div className="hc-bottom">
                  <span className="hc-total">{fmt(o.total)} ₽</span>
                  <button className="repeat-btn" onClick={() => repeatOrder(o)}>🔁 Повторить</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => show('home')}><div className="nav-icon">🍔</div><span>Меню</span></div>
        <div className="nav-item" onClick={() => show('cart')}><div className="nav-icon">🛒</div><span>Корзина</span></div>
        <div className="nav-item active"><div className="nav-icon">👤</div><span>Профиль</span><div className="nav-dot" /></div>
      </div>
    </div>
  );
}

/* ══ ADMIN ORDERS ══ */
const ADMIN_FLOW: Record<Exclude<OrderStatus, 'done'>, { next: OrderStatus; label: string; btn: string; bar: string }> = {
  sent:     { next: 'accepted', label: '✓ Принять',  btn: 'confirm',  bar: 'pending' },
  accepted: { next: 'cooking',  label: '🔥 Готовить', btn: 'confirm',  bar: 'confirmed' },
  cooking:  { next: 'ready',    label: '📦 Готово',   btn: 'done',     bar: 'confirmed' },
  ready:    { next: 'done',     label: '✅ Выдан',    btn: 'complete', bar: 'ready' },
};

function AdminOrdersScreen({ active, show, orders, updateStatus }: {
  active: boolean; show: ShowFn; orders: Order[]; updateStatus: (num: string, s: OrderStatus) => void;
}) {
  const [filter, setFilter] = useState(0);
  const filters: { label: string; match: (s: OrderStatus) => boolean }[] = [
    { label: 'Все', match: () => true },
    { label: '✋ Принять', match: (s) => s === 'sent' },
    { label: '🔥 Готовятся', match: (s) => s === 'accepted' || s === 'cooking' },
    { label: '📦 К выдаче', match: (s) => s === 'ready' },
    { label: '✅ Выданы', match: (s) => s === 'done' },
  ];
  const activeCount = orders.filter((o) => o.status !== 'done').length;
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const order: Record<OrderStatus, number> = { sent: 0, accepted: 1, cooking: 2, ready: 3, done: 4 };
  const list = orders.filter((o) => filters[filter].match(o.status)).sort((a, b) => (order[a.status] - order[b.status]) || (b.ts - a.ts));

  return (
    <div className={screenClass(active)}>
      <div className="admin-header">
        <div className="admin-header-top">
          <div className="admin-title">⚙️ Заказы</div>
          <div className="admin-badge">{activeCount} активных</div>
        </div>
        <div className="stats-row">
          <div className="stat"><div className="stat-num">{orders.length}</div><div className="stat-label">заказов сегодня</div></div>
          <div className="stat"><div className="stat-num">{fmt(revenue)} ₽</div><div className="stat-label">выручка</div></div>
        </div>
        <div className="filter-tabs">
          {filters.map((f, i) => (
            <div key={f.label} className={'f-tab' + (filter === i ? ' active' : '')} onClick={() => setFilter(i)}>{f.label}</div>
          ))}
        </div>
      </div>
      <div className="scroll-body">
        {list.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-emoji">📋</div>
            <div className="admin-empty-title">Заказов нет</div>
            <div className="admin-empty-sub">Новые заказы клиентов появятся здесь автоматически</div>
          </div>
        ) : (
          <div className="admin-orders">
            {list.map((o) => {
              const flow = o.status === 'done' ? null : ADMIN_FLOW[o.status];
              return (
                <div className="admin-order-card" key={o.num}>
                  <div className={'aoc-left-bar ' + (flow?.bar ?? 'ready')} />
                  <div style={{ paddingLeft: 8 }}>
                    <div className="aoc-top">
                      <div className="aoc-num">{o.num} <span className="aoc-method">{o.method === 'delivery' ? '🛵' : '🏃'}</span></div>
                      <div className="aoc-time">{relativeTime(o.ts)}</div>
                    </div>
                    <div className="aoc-client">{o.client.name}{o.client.phone ? ' · ' + o.client.phone : ''}</div>
                    <div className="aoc-items-text">{o.lines.map((l) => `${l.item.name} × ${l.qty}`).join(', ')}</div>
                    {o.method === 'delivery' && o.address && <div className="aoc-extra">📍 {o.address}</div>}
                    {o.whenText && <div className="aoc-extra">🕐 {o.whenText}</div>}
                    {o.comment && <div className="aoc-extra">💬 {o.comment}</div>}
                    <div className="aoc-bottom">
                      <div className="aoc-total">{fmt(o.total)} ₽</div>
                      {flow && (
                        <button className={'aoc-btn ' + flow.btn} onClick={() => updateStatus(o.num, flow.next)}>{flow.label}</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="admin-nav">
        <div className="nav-item active"><div className="nav-icon">📋</div><span>Заказы</span><div className="nav-dot" /></div>
        <div className="nav-item" onClick={() => show('admin-products')}><div className="nav-icon">🍔</div><span>Товары</span></div>
        <div className="nav-item" onClick={() => show('admin-profile')}><div className="nav-icon">⚙️</div><span>Настройки</span></div>
      </div>
    </div>
  );
}

/* ══ ADMIN PRODUCTS ══ */
function AdminProductsScreen({ active, show, products, setProducts }: {
  active: boolean; show: ShowFn; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}) {
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const catTitle = (id: string) => CATEGORIES.find((c) => c.id === id)?.title ?? '';

  const save = (p: Product) => {
    setProducts((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i >= 0) { const c = [...prev]; c[i] = p; return c; }
      return [...prev, p];
    });
    setEditing(null);
  };
  const remove = (id: string) => {
    setProducts((prev) => prev.filter((x) => x.id !== id));
    setEditing(null);
  };

  return (
    <div className={screenClass(active)}>
      <div className="admin-header">
        <div className="admin-header-top">
          <div className="admin-title">🍔 Товары</div>
          <div className="admin-badge">{products.length} позиций</div>
        </div>
      </div>
      <div className="scroll-body">
        <div className="admin-products">
          <button className="add-product-btn" onClick={() => setEditing('new')}>+ Добавить товар</button>
          {products.map((p) => (
            <div className="product-card" key={p.id}>
              <div className="product-img">{p.emoji}</div>
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-cat">{catTitle(p.cat)}</div>
              </div>
              <div className="product-price">{p.price} ₽</div>
              <div className="product-actions">
                <button className="pa-btn" onClick={() => setEditing(p)}>✏️</button>
                <button className="pa-btn" onClick={() => remove(p.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-nav">
        <div className="nav-item" onClick={() => show('admin-orders')}><div className="nav-icon">📋</div><span>Заказы</span></div>
        <div className="nav-item active"><div className="nav-icon">🍔</div><span>Товары</span><div className="nav-dot" /></div>
        <div className="nav-item" onClick={() => show('admin-profile')}><div className="nav-icon">⚙️</div><span>Настройки</span></div>
      </div>

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }: {
  product: Product | null; onSave: (p: Product) => void; onClose: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [desc, setDesc] = useState(product?.desc ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [emoji, setEmoji] = useState(product?.emoji ?? '🍔');
  const [cat, setCat] = useState(product?.cat ?? CATEGORIES[0].id);

  const valid = name.trim().length >= 2 && Number(price) > 0;
  const submit = () => {
    onSave({
      id: product?.id ?? 'c' + Date.now(),
      name: name.trim(), desc: desc.trim(), price: Number(price), emoji: emoji.trim() || '🍔', cat,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{product ? 'РЕДАКТИРОВАТЬ' : 'НОВЫЙ ТОВАР'}</div>

        <label className="modal-label">Название</label>
        <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Папа Мясника" />

        <label className="modal-label">Категория</label>
        <select className="modal-input" value={cat} onChange={(e) => setCat(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="modal-label">Цена, ₽</label>
            <input className="modal-input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="580" />
          </div>
          <div style={{ width: 90 }}>
            <label className="modal-label">Эмодзи</label>
            <input className="modal-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍔" style={{ textAlign: 'center' }} />
          </div>
        </div>

        <label className="modal-label">Состав / описание</label>
        <textarea className="cart-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Булочка, соус, котлета..." />

        <button className="modal-submit" disabled={!valid} onClick={submit}>{product ? 'Сохранить' : 'Добавить'}</button>
      </div>
    </div>
  );
}

/* ══ ADMIN PROFILE / SETTINGS ══ */
function AdminProfileScreen({ active, show, settings, setSettings, orders }: {
  active: boolean; show: ShowFn; settings: Settings; setSettings: React.Dispatch<React.SetStateAction<Settings>>; orders: Order[];
}) {
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  const sendBroadcast = () => {
    if (!msg.trim()) return;
    // Без бэкенда — демо-подтверждение. Реальная отправка появится с сервером.
    setSent(true);
    setMsg('');
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className={screenClass(active)}>
      <div className="admin-header">
        <div className="admin-header-top">
          <div className="admin-title">⚙️ Настройки</div>
        </div>
      </div>
      <div className="scroll-body">
        <div className="admin-profile-body">
          <div className="ap-section">
            <div className="ap-section-title">Статус заведения</div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Заведение открыто</div>
                <div className="toggle-sub">Клиенты могут делать заказы</div>
              </div>
              <div className={'toggle' + (settings.open ? ' on' : '')} onClick={() => patch({ open: !settings.open })} />
            </div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Время работы</div>
            <div className="time-row">
              <input className="time-input" type="time" value={settings.workFrom} onChange={(e) => patch({ workFrom: e.target.value })} />
              <div className="time-sep">—</div>
              <input className="time-input" type="time" value={settings.workTo} onChange={(e) => patch({ workTo: e.target.value })} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 10 }}>Клиенты видят «Открыто / Закрыто» на основе этого времени</div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Статистика за сегодня</div>
            <div className="stats-row" style={{ marginBottom: 0 }}>
              <div className="stat"><div className="stat-num">{orders.length}</div><div className="stat-label">заказов</div></div>
              <div className="stat"><div className="stat-num">{fmt(orders.reduce((s, o) => s + o.total, 0))} ₽</div><div className="stat-label">выручка</div></div>
              <div className="stat"><div className="stat-num">{orders.filter((o) => o.status === 'done').length}</div><div className="stat-label">выдано</div></div>
            </div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Рассылка клиентам</div>
            <textarea className="broadcast-textarea" placeholder="Напишите сообщение для всех клиентов... Например: «Сегодня скидка 20% на все бургеры с 18 до 20:00 🔥»" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <button className="broadcast-btn" onClick={sendBroadcast}>{sent ? '✓ Отправлено' : '📢 Отправить всем клиентам'}</button>
            <div style={{ fontSize: 11, color: 'var(--text-sec)', marginTop: 8 }}>Реальная отправка подключится с бэкендом</div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Уведомления</div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Новые заказы</div>
                <div className="toggle-sub">Звук и вибрация</div>
              </div>
              <div className={'toggle' + (settings.notifyNew ? ' on' : '')} onClick={() => patch({ notifyNew: !settings.notifyNew })} />
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Push-уведомления</div>
              </div>
              <div className={'toggle' + (settings.notifyPush ? ' on' : '')} onClick={() => patch({ notifyPush: !settings.notifyPush })} />
            </div>
          </div>
        </div>
      </div>
      <div className="admin-nav">
        <div className="nav-item" onClick={() => show('admin-orders')}><div className="nav-icon">📋</div><span>Заказы</span></div>
        <div className="nav-item" onClick={() => show('admin-products')}><div className="nav-icon">🍔</div><span>Товары</span></div>
        <div className="nav-item active"><div className="nav-icon">⚙️</div><span>Настройки</span><div className="nav-dot" /></div>
      </div>
    </div>
  );
}
