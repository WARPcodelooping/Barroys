import { useState, useEffect, Fragment } from 'react';
import { MENU, CATEGORY_TABS, type MenuItem } from './data';

type ScreenId =
  | 'auth' | 'home' | 'item' | 'cart' | 'confirm' | 'profile'
  | 'admin-orders' | 'admin-products' | 'admin-profile';

type ShowFn = (id: ScreenId) => void;

interface CartLine { item: MenuItem; qty: number; }
interface User { name: string; phone: string; }

type OrderStatus = 'sent' | 'accepted' | 'cooking' | 'ready' | 'done';
interface Order {
  num: string;
  lines: CartLine[];
  total: number;
  status: OrderStatus;
  date: string;
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

function nextOrderNum(): string {
  let n = 45;
  try {
    const raw = localStorage.getItem(ORDER_SEQ_KEY);
    n = (raw ? parseInt(raw, 10) : 44) + 1;
    localStorage.setItem(ORDER_SEQ_KEY, String(n));
  } catch {
    n = 45;
  }
  return '#' + String(n).padStart(3, '0');
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(loadUser);
  const [screen, setScreen] = useState<ScreenId>(() => (loadUser() ? 'home' : 'auth'));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [showReg, setShowReg] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [history] = useState<Order[]>([]);

  const show = (id: ScreenId) => setScreen(id);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.item.price, 0);

  const addToCart = (item: MenuItem, n = 1) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.item.name === item.name);
      if (ex) return prev.map((l) => (l.item.name === item.name ? { ...l, qty: l.qty + n } : l));
      return [...prev, { item, qty: n }];
    });
  };
  const changeQty = (name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.item.name === name ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };
  const qtyOf = (name: string) => cart.find((l) => l.item.name === name)?.qty ?? 0;

  // Авторизация: если новый клиент — открываем регистрацию, иначе сразу в меню
  const onLogin = () => {
    if (user) { show('home'); return; }
    setShowReg(true);
  };
  const onRegister = (u: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    setShowReg(false);
    show('home');
  };

  const checkout = () => {
    if (cart.length === 0) return;
    const order: Order = {
      num: nextOrderNum(),
      lines: cart,
      total: cartTotal,
      status: 'sent',
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) +
        ', ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
    setCurrentOrder(order);
    setCart([]);
    show('confirm');
  };

  const openItem = (item: MenuItem) => { setSelected(item); show('item'); };

  const isAdmin = screen.startsWith('admin-');

  return (
    <div className="phone">
      {/* Превью-переключатель роли (временный, уберём когда роль будет по Telegram ID) */}
      <button className="role-toggle" onClick={() => show(isAdmin ? 'home' : 'admin-orders')}>
        {isAdmin ? '👤 Клиент' : '⚙️ Админ'}
      </button>

      <AuthScreen active={screen === 'auth'} onLogin={onLogin} />
      <HomeScreen
        active={screen === 'home'}
        show={show}
        addToCart={addToCart}
        openItem={openItem}
        cartCount={cartCount}
        cartTotal={cartTotal}
      />
      <ItemScreen active={screen === 'item'} show={show} item={selected} qty={selected ? qtyOf(selected.name) : 0} addToCart={addToCart} />
      <CartScreen active={screen === 'cart'} show={show} cart={cart} total={cartTotal} changeQty={changeQty} checkout={checkout} />
      <ConfirmScreen active={screen === 'confirm'} show={show} order={currentOrder} />
      <ProfileScreen active={screen === 'profile'} show={show} user={user} order={currentOrder} history={history} />
      <AdminOrdersScreen active={screen === 'admin-orders'} show={show} />
      <AdminProductsScreen active={screen === 'admin-products'} show={show} />
      <AdminProfileScreen active={screen === 'admin-profile'} show={show} />

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
  const [name, setName] = useState<string>(
    tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : '',
  );
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
        <input
          className="modal-input"
          placeholder="Как вас зовут?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="modal-label">Телефон</label>
        <input
          className="modal-input"
          placeholder="+7 (___) ___-__-__"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
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
function HomeScreen({ active, show, addToCart, openItem, cartCount, cartTotal }: {
  active: boolean; show: ShowFn; addToCart: (i: MenuItem) => void; openItem: (i: MenuItem) => void;
  cartCount: number; cartTotal: number;
}) {
  const [tab, setTab] = useState(0);

  const goCategory = (i: number) => {
    setTab(i);
    const el = document.getElementById(MENU[i].id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={screenClass(active)}>
      <div className="home-header">
        <div className="home-topbar">
          <div className="home-logo">БАРР<span>🍔</span>ЙС</div>
          <div className="open-badge open"><div className="dot" />Открыто до 23:00</div>
        </div>
      </div>
      <div className="cat-tabs">
        {CATEGORY_TABS.map((t, i) => (
          <div key={t} className={'cat-tab' + (tab === i ? ' active' : '')} onClick={() => goCategory(i)}>{t}</div>
        ))}
      </div>
      <div className="scroll-body" style={{ paddingBottom: cartCount > 0 ? 80 : 16 }}>
        {MENU.map((section) => (
          <div className="menu-section" id={section.id} key={section.id}>
            <div className="menu-section-title">{section.title}</div>
            <div className="menu-items">
              {section.items.map((it) => (
                <div className="menu-item" key={it.name} onClick={() => openItem(it)}>
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
  active: boolean; show: ShowFn; item: MenuItem | null; qty: number; addToCart: (i: MenuItem, n: number) => void;
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
        <button className="add-to-cart-btn" onClick={() => { addToCart(item, n); show('cart'); }}>
          🛒 Добавить в корзину
        </button>
      </div>
    </div>
  );
}

/* ══ CART ══ */
function CartScreen({ active, show, cart, total, changeQty, checkout }: {
  active: boolean; show: ShowFn; cart: CartLine[]; total: number;
  changeQty: (name: string, delta: number) => void; checkout: () => void;
}) {
  const empty = cart.length === 0;
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
                <div className="cart-item" key={l.item.name}>
                  <div className="cart-item-img">{l.item.emoji}</div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{l.item.name}</div>
                    <div className="cart-item-price">{fmt(l.item.price * l.qty)} ₽</div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="ci-btn" onClick={() => changeQty(l.item.name, -1)}>−</button>
                    <span className="ci-qty">{l.qty}</span>
                    <button className="ci-btn" onClick={() => changeQty(l.item.name, +1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="cart-total-row"><span className="cart-total-label">Товары</span><span className="cart-total-val">{fmt(total)} ₽</span></div>
            <div className="cart-total-row big"><span className="cart-total-label">Итого</span><span className="cart-total-val">{fmt(total)} ₽</span></div>
            <button className="pay-btn" onClick={checkout}>💳 Оплатить {fmt(total)} ₽</button>
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
        <div className="confirm-order-num">{order?.num ?? '#—'}</div>
        <div className="confirm-desc">Ваш заказ передан на кухню.<br />Следите за статусом в профиле.</div>
        <button className="confirm-btn" onClick={() => show('profile')} style={{ background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, fontSize: 15 }}>Следить за заказом</button>
        <button className="confirm-btn" onClick={() => show('home')}>Вернуться в меню</button>
      </div>
    </div>
  );
}

/* ══ PROFILE (CLIENT) ══ */
function ProfileScreen({ active, show, user, order, history }: {
  active: boolean; show: ShowFn; user: User | null; order: Order | null; history: Order[];
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
            <div className="co-items">
              {order.lines.map((l) => (
                <div className="co-item" key={l.item.name}>
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
                <div className="hc-bottom"><span className="hc-total">{fmt(o.total)} ₽</span><span className="status-pill done">Выдан</span></div>
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
function AdminOrdersScreen({ active, show }: { active: boolean; show: ShowFn }) {
  const [filter, setFilter] = useState(0);
  const filters = ['Все', 'Ожидают ✋', 'Готовятся 🔥', 'Готово 📦'];
  return (
    <div className={screenClass(active)}>
      <div className="admin-header">
        <div className="admin-header-top">
          <div className="admin-title">⚙️ Заказы</div>
          <div className="admin-badge">4 активных</div>
        </div>
        <div className="filter-tabs">
          {filters.map((f, i) => (
            <div key={f} className={'f-tab' + (filter === i ? ' active' : '')} onClick={() => setFilter(i)}>{f}</div>
          ))}
        </div>
      </div>
      <div className="scroll-body">
        <div className="admin-orders">
          <div className="admin-order-card">
            <div className="aoc-left-bar pending" />
            <div style={{ paddingLeft: 8 }}>
              <div className="aoc-top"><div className="aoc-num">#043</div><div className="aoc-time">только что</div></div>
              <div className="aoc-client">Мария Соколова · +7 (912) 345-67-89</div>
              <div className="aoc-items-text">Семён Сыроделов × 1, Картофель Фри × 1, Лимонад × 1</div>
              <div className="aoc-bottom">
                <div className="aoc-total">1 070 ₽</div>
                <button className="aoc-btn confirm">✓ Подтвердить</button>
              </div>
            </div>
          </div>
          <div className="admin-order-card">
            <div className="aoc-left-bar confirmed" />
            <div style={{ paddingLeft: 8 }}>
              <div className="aoc-top"><div className="aoc-num">#042</div><div className="aoc-time">12 мин назад</div></div>
              <div className="aoc-client">Андрей Никитин · +7 (999) 123-45-67</div>
              <div className="aoc-items-text">Вишня на конце × 1, Рулон Гриль × 1</div>
              <div className="aoc-bottom">
                <div className="aoc-total">1 030 ₽</div>
                <button className="aoc-btn done">📦 Готово</button>
              </div>
            </div>
          </div>
          <div className="admin-order-card">
            <div className="aoc-left-bar ready" />
            <div style={{ paddingLeft: 8 }}>
              <div className="aoc-top"><div className="aoc-num">#041</div><div className="aoc-time">25 мин назад</div></div>
              <div className="aoc-client">Иван Петров · +7 (900) 111-22-33</div>
              <div className="aoc-items-text">Отец Папы Мясника × 1, Луковые кольца × 1</div>
              <div className="aoc-bottom">
                <div className="aoc-total">990 ₽</div>
                <button className="aoc-btn complete">✅ Завершён</button>
              </div>
            </div>
          </div>
          <div className="admin-order-card">
            <div className="aoc-left-bar pending" />
            <div style={{ paddingLeft: 8 }}>
              <div className="aoc-top"><div className="aoc-num">#044</div><div className="aoc-time">3 мин назад</div></div>
              <div className="aoc-client">Екатерина Волк · +7 (965) 778-90-12</div>
              <div className="aoc-items-text">Бокс по-Техасски × 2</div>
              <div className="aoc-bottom">
                <div className="aoc-total">1 140 ₽</div>
                <button className="aoc-btn confirm">✓ Подтвердить</button>
              </div>
            </div>
          </div>
        </div>
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
function AdminProductsScreen({ active, show }: { active: boolean; show: ShowFn }) {
  const products = [
    { name: 'Папа Мясника', cat: 'Мраморная говядина', price: 580, emoji: '🍔' },
    { name: 'Горячий Мексиканец', cat: 'Мраморная говядина', price: 570, emoji: '🍔' },
    { name: 'Вишня на конце', cat: 'Новинки', price: 610, emoji: '🍔' },
    { name: 'Рулон Гриль', cat: 'Новинки', price: 420, emoji: '🌯' },
    { name: 'Картофель Фри', cat: 'Закуски', price: 180, emoji: '🍟' },
    { name: 'Том Ямус', cat: 'Новинки', price: 550, emoji: '🍜' },
  ];
  return (
    <div className={screenClass(active)}>
      <div className="admin-header">
        <div className="admin-header-top">
          <div className="admin-title">🍔 Товары</div>
          <div className="admin-badge">28 позиций</div>
        </div>
      </div>
      <div className="scroll-body">
        <div className="admin-products">
          <button className="add-product-btn">+ Добавить товар</button>
          {products.map((p) => (
            <div className="product-card" key={p.name}>
              <div className="product-img">{p.emoji}</div>
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-cat">{p.cat}</div>
              </div>
              <div className="product-price">{p.price} ₽</div>
              <div className="product-actions">
                <button className="pa-btn">✏️</button>
                <button className="pa-btn">🗑</button>
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
    </div>
  );
}

/* ══ ADMIN PROFILE / SETTINGS ══ */
function AdminProfileScreen({ active, show }: { active: boolean; show: ShowFn }) {
  const [open, setOpen] = useState(true);
  const [newOrders, setNewOrders] = useState(true);
  const [push, setPush] = useState(true);
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
              <div className={'toggle' + (open ? ' on' : '')} onClick={() => setOpen((v) => !v)} />
            </div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Время работы</div>
            <div className="time-row">
              <div className="time-input">11:00</div>
              <div className="time-sep">—</div>
              <div className="time-input">23:00</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 10 }}>Клиенты видят «Открыто / Закрыто» на основе этого времени</div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Рассылка клиентам</div>
            <textarea className="broadcast-textarea" placeholder="Напишите сообщение для всех клиентов... Например: «Сегодня скидка 20% на все бургеры с 18 до 20:00 🔥»" />
            <button className="broadcast-btn">📢 Отправить всем клиентам</button>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Уведомления</div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Новые заказы</div>
                <div className="toggle-sub">Звук и вибрация</div>
              </div>
              <div className={'toggle' + (newOrders ? ' on' : '')} onClick={() => setNewOrders((v) => !v)} />
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Push-уведомления</div>
              </div>
              <div className={'toggle' + (push ? ' on' : '')} onClick={() => setPush((v) => !v)} />
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
