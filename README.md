# FitProfit — Panel administracyjny

Backend admin do konfiguracji wyzwań grywalizacyjnych aplikacji FitProfit,
połączony z aplikacją uczestnika przez wspólne API.

## Co działa

- Backend API (Node + Express) — uwierzytelnianie JWT, role admin/koordynator.
- Baza danych — PostgreSQL (produkcja) lub SQLite (lokalnie), wybór automatyczny.
- Panel administracyjny (React) — logowanie + pulpit z konfiguracją na żywo.
- `GET /api/app/config` — punkt integracji: aplikacja pobiera tu konfigurację.
- Plik `render.yaml` — gotowe wdrożenie jednym kliknięciem na Render.

## Wymagania

- Node.js 22+

## Uruchomienie lokalne

Backend (w terminalu nr 1):

```bash
cd backend
npm install
npm run dev      # API + baza SQLite na http://localhost:4000
```

Panel (w terminalu nr 2):

```bash
cd panel
npm install
npm run dev      # panel na http://localhost:5174
```

Baza zasiewa się sama przy pierwszym starcie. Logowanie:

| E-mail | Hasło | Rola |
|---|---|---|
| admin@fitprofit.app | admin123 | admin |
| koordynator@fitprofit.app | koordynator123 | koordynator |

## Baza danych — jak działa wybór

- Brak zmiennej `DATABASE_URL` → SQLite (plik `backend/data.db`) — wygodne lokalnie.
- Ustawiona `DATABASE_URL` → PostgreSQL — używane w produkcji na Render.

Ten sam kod, ten sam schemat — bez zmian w aplikacji.

## Wdrożenie na Render

Repozytorium zawiera `render.yaml` (Blueprint). Na Render:
„New" → „Blueprint" → wskaż to repozytorium. Render utworzy bazę PostgreSQL
i serwis WWW, zbuduje panel i uruchomi backend. `JWT_SECRET` generuje się
automatycznie, `DATABASE_URL` podpina się z bazy.

> Uwaga: darmowy serwis Render usypia po 15 min bezczynności (pierwsze wejście
> ~minutę), a darmowa baza jest kasowana po 30 dniach.

## Łańcuch integracji

```
panel admin → API → baza → /api/app/config → aplikacja FitProfit
```
