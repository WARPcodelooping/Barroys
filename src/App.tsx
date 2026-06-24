import { useState, type ReactNode } from 'react';
import { MENU, CATEGORY_TABS } from './data';

type ScreenId =
  | 'auth' | 'home' | 'item' | 'cart' | 'confirm' | 'profile'
  | 'admin-orders' | 'admin-products' | 'admin-profile';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('auth');
  const show = (id: ScreenId) => setScreen(id);

  return (
    <>
      <div className="app-label">БАРРОЙС БУРГЕР · MINI APP</div>

      {/* Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420, width: '100%' }}>
        <div className="sw-group">
          <div className="sw-label">👤 Клиент</div>
          <div className="sw-row">
            <SwBtn id="auth" cur={screen} show={show}>Авторизация</SwBtn>
            <SwBtn id="home" cur={screen} show={show}>Каталог</SwBtn>
            <SwBtn id="item" cur={screen} show={show}>Товар</SwBtn>
            <SwBtn id="cart" cur={screen} show={show}>Корзина</SwBtn>
            <SwBtn id="confirm" cur={screen} show={show}>Заказ принят</SwBtn>
            <SwBtn id="profile" cur={screen} show={show}>Профиль</SwBtn>
          </div>
        </div>
        <div className="sw-group">
          <div className="sw-label">⚙️ Админ</div>
          <div className="sw-row">
            <SwBtn id="admin-orders" cur={screen} show={show}>Заказы</SwBtn>
            <SwBtn id="admin-products" cur={screen} show={show}>Товары</SwBtn>
            <SwBtn id="admin-profile" cur={screen} show={show}>Настройки</SwBtn>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="phone">
        <AuthScreen active={screen === 'auth'} show={show} />
        <HomeScreen active={screen === 'home'} show={show} />
        <ItemScreen active={screen === 'item'} show={show} />
        <CartScreen active={screen === 'cart'} show={show} />
        <ConfirmScreen active={screen === 'confirm'} show={show} />
        <ProfileScreen active={screen === 'profile'} show={show} />
        <AdminOrdersScreen active={screen === 'admin-orders'} show={show} />
        <AdminProductsScreen active={screen === 'admin-products'} show={show} />
        <AdminProfileScreen active={screen === 'admin-profile'} show={show} />
      </div>
    </>
  );
}

type ShowFn = (id: ScreenId) => void;

function SwBtn({ id, cur, show, children }: { id: ScreenId; cur: ScreenId; show: ShowFn; children: ReactNode }) {
  return (
    <button className={'sw-btn' + (cur === id ? ' active' : '')} onClick={() => show(id)}>
      {children}
    </button>
  );
}

function screenClass(active: boolean) {
  return 'screen' + (active ? ' active' : '');
}

/* ══ AUTH ══ */
function AuthScreen({ active, show }: { active: boolean; show: ShowFn }) {
  return (
    <div className={screenClass(active)}>
      <div className="auth-screen">
        <div className="auth-glow" />
        <div className="auth-logo">БАРР<span>🍔</span>ЙС<br />БУРГЕР</div>
        <div className="auth-tagline">Мясо. Огонь. Вкус.</div>
        <div className="auth-burger-emoji">🔥</div>
        <div className="auth-desc">Войдите чтобы сделать заказ.<br /><strong>Номер телефона возьмём из Telegram</strong> — одна кнопка, без лишних шагов.</div>
        <button className="tg-btn" onClick={() => show('home')}>
          <span className="tg-icon">📱</span>
          Войти через Telegram
        </button>
      </div>
    </div>
  );
}

/* ══ HOME / CATALOG ══ */
function HomeScreen({ active, show }: { active: boolean; show: ShowFn }) {
  const [tab, setTab] = useState(0);
  const [added, setAdded] = useState<Record<string, boolean>>({});

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
          <div key={t} className={'cat-tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>
      <div className="scroll-body" style={{ paddingBottom: 80 }}>
        {MENU.map((section) => (
          <div className="menu-section" key={section.title}>
            <div className="menu-section-title">{section.title}</div>
            <div className="menu-items">
              {section.items.map((it) => {
                const key = section.title + it.name;
                const isAdded = !!added[key];
                return (
                  <div className="menu-item" key={key} onClick={() => show('item')}>
                    <div className="menu-item-img">{it.emoji}</div>
                    <div className="menu-item-info">
                      <div>
                        <div className="menu-item-name">{it.name}</div>
                        <div className="menu-item-desc">{it.desc}</div>
                      </div>
                      <div className="menu-item-bottom">
                        <div className="menu-item-price">{it.price} ₽</div>
                        <button
                          className={'add-btn' + (isAdded ? ' added' : '')}
                          onClick={(e) => { e.stopPropagation(); setAdded((p) => ({ ...p, [key]: !p[key] })); }}
                        >
                          {isAdded ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="cart-fab" onClick={() => show('cart')}>
        🛒 Корзина
        <div className="cart-count">2</div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>· 1 030 ₽</span>
      </button>
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
function ItemScreen({ active, show }: { active: boolean; show: ShowFn }) {
  return (
    <div className={screenClass(active)}>
      <div className="item-hero">
        <button className="back-btn" onClick={() => show('home')}>←</button>
        🍔
      </div>
      <div className="item-body">
        <div className="item-name">ВИШНЯ НА КОНЦЕ</div>
        <div className="item-price-big">610 <span>₽</span></div>
        <div className="item-section-label">Состав</div>
        <div className="item-ingredients">
          Булочка, фирменный горчичный соус, салат, томат, сочная мраморная говядина, огурец маринованный, бекон, фирменный вишнёвый соус, луковые кольца
        </div>
        <div className="qty-row">
          <button className="qty-btn">−</button>
          <span className="qty-num">1</span>
          <button className="qty-btn">+</button>
          <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>× 610 ₽ = <strong style={{ color: 'var(--text)' }}>610 ₽</strong></span>
        </div>
        <button className="add-to-cart-btn" onClick={() => show('cart')}>
          🛒 Добавить в корзину
        </button>
      </div>
    </div>
  );
}

/* ══ CART ══ */
function CartScreen({ active, show }: { active: boolean; show: ShowFn }) {
  return (
    <div className={screenClass(active)}>
      <div className="cart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            className="back-btn"
            style={{ position: 'static', width: 32, height: 32, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 16 }}
            onClick={() => show('home')}
          >←</button>
          <div className="cart-title">КОРЗИНА</div>
        </div>
      </div>
      <div className="scroll-body">
        <div className="cart-items">
          <div className="cart-item">
            <div className="cart-item-img">🍔</div>
            <div className="cart-item-info">
              <div className="cart-item-name">Вишня на конце</div>
              <div className="cart-item-price">610 ₽</div>
            </div>
            <div className="cart-item-controls">
              <button className="ci-btn">−</button>
              <span className="ci-qty">1</span>
              <button className="ci-btn">+</button>
            </div>
          </div>
          <div className="cart-item">
            <div className="cart-item-img">🌯</div>
            <div className="cart-item-info">
              <div className="cart-item-name">Рулон Гриль</div>
              <div className="cart-item-price">420 ₽</div>
            </div>
            <div className="cart-item-controls">
              <button className="ci-btn">−</button>
              <span className="ci-qty">1</span>
              <button className="ci-btn">+</button>
            </div>
          </div>
        </div>
        <div className="divider" />
        <div className="cart-total-row"><span className="cart-total-label">Товары</span><span className="cart-total-val">1 030 ₽</span></div>
        <div className="cart-total-row big"><span className="cart-total-label">Итого</span><span className="cart-total-val">1 030 ₽</span></div>
        <button className="pay-btn" onClick={() => show('confirm')}>💳 Оплатить 1 030 ₽</button>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

/* ══ ORDER CONFIRMED ══ */
function ConfirmScreen({ active, show }: { active: boolean; show: ShowFn }) {
  return (
    <div className={screenClass(active)}>
      <div className="confirm-screen">
        <div className="confirm-icon">✓</div>
        <div className="confirm-title">ЗАКАЗ ПРИНЯТ!</div>
        <div style={{ fontSize: 13, color: 'var(--text-sec)', letterSpacing: '0.06em' }}>НОМЕР ЗАКАЗА</div>
        <div className="confirm-order-num">#042</div>
        <div className="confirm-desc">Ваш заказ передан на кухню.<br />Следите за статусом в профиле.</div>
        <button className="confirm-btn" onClick={() => show('profile')} style={{ background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, fontSize: 15 }}>Следить за заказом</button>
        <button className="confirm-btn" onClick={() => show('home')}>Вернуться в меню</button>
      </div>
    </div>
  );
}

/* ══ PROFILE (CLIENT) ══ */
function ProfileScreen({ active, show }: { active: boolean; show: ShowFn }) {
  return (
    <div className={screenClass(active)}>
      <div className="profile-top">
        <div className="profile-avatar">АН</div>
        <div>
          <div className="profile-name">Андрей Никитин</div>
          <div className="profile-phone">+7 (999) 123-45-67</div>
        </div>
      </div>
      <div className="scroll-body">
        <div className="current-order">
          <div className="co-header">
            <div className="co-title">Текущий заказ</div>
            <div className="co-num">#042</div>
          </div>
          <div className="status-steps">
            <div className="step"><div className="step-circle done">✓</div><div className="step-label">Принят</div></div>
            <div className="step-line done" />
            <div className="step"><div className="step-circle active">🔥</div><div className="step-label">Готовится</div></div>
            <div className="step-line" />
            <div className="step"><div className="step-circle">📦</div><div className="step-label">Готово</div></div>
            <div className="step-line" />
            <div className="step"><div className="step-circle">✅</div><div className="step-label">Выдан</div></div>
          </div>
          <div className="co-items">
            <div className="co-item"><span>Вишня на конце × 1</span><span>610 ₽</span></div>
            <div className="co-item"><span>Рулон Гриль × 1</span><span>420 ₽</span></div>
          </div>
          <div className="co-total">
            <span>Итого</span>
            <span>1 030 ₽</span>
          </div>
        </div>
        <div className="orders-history-title">История заказов</div>
        <div className="history-items">
          <div className="history-card">
            <div className="hc-top"><span className="hc-num">#038</span><span className="hc-date">19 июня, 18:42</span></div>
            <div className="hc-items">Папа Мясника × 1, Картофель Фри × 2, Лимонад × 1</div>
            <div className="hc-bottom"><span className="hc-total">1 040 ₽</span><span className="status-pill done">Выдан</span></div>
          </div>
          <div className="history-card">
            <div className="hc-top"><span className="hc-num">#031</span><span className="hc-date">14 июня, 20:15</span></div>
            <div className="hc-items">Горячий Мексиканец × 1, Луковые кольца × 1</div>
            <div className="hc-bottom"><span className="hc-total">870 ₽</span><span className="status-pill done">Выдан</span></div>
          </div>
          <div className="history-card">
            <div className="hc-top"><span className="hc-num">#024</span><span className="hc-date">8 июня, 13:30</span></div>
            <div className="hc-items">American Boy × 2</div>
            <div className="hc-bottom"><span className="hc-total">1 120 ₽</span><span className="status-pill cancelled">Отменён</span></div>
          </div>
        </div>
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
