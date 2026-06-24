# Барройс Бургер — Telegram Mini App

Мини-апп бургерной: каталог → корзина → оплата → статус заказа на кухне, плюс админка
(заказы, товары, настройки/рассылка). Движок переиспользуется из шаблона `nails-verkula`,
но переносится **по частям** (сначала дизайн, затем бэкенд/логика кнопок).

## Статус
- ✅ **Дизайн** — перенесён 1:1 из прототипа `barroys-burger.html` (React + Vite + TS).
  Все экраны (клиент + админ) и переключатель экранов работают на статике/моках.
- ⏳ Бэкенд (Telegram-авторизация, заказы, БД, уведомления, рассылка) — следующий этап,
  берём из движка nails-verkula аккуратно, без брендинга Веркулы.

## Запуск
Node.js найден в составе Visual Studio (npm не в PATH глобально):

```
C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs
```

```powershell
$env:Path = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;" + $env:Path
cd C:\Users\Пользователь\Desktop\барройс
npm install      # первый раз
npm run dev      # http://localhost:3000
```

## Структура
```
src/
├── main.tsx     # точка входа
├── App.tsx      # все экраны + переключатель (клиент/админ)
├── data.ts      # меню (категории, позиции) из прототипа
└── styles.css   # стили прототипа 1:1
```
