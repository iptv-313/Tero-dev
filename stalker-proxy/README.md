# TeroDev Stalker Proxy

Node.js proxy for the TeroDev Android TV and web clients. It reads saved portal settings and access codes from SQLite, fetches Live TV, Movies, and Series from the selected Stalker portal, resolves playback, and relays media through short-lived opaque stream tickets.

## Run locally

```bash
cd stalker-proxy
cp .env.example .env
npm install
npm start
```

The default address is `http://localhost:3001`; verify with `GET /health`.

## SQLite database

`src/db.js` opens `database.sqlite` in this folder by default and creates missing tables at startup. Existing databases keep their current access codes and portals. For a **new, empty** database, set `INITIAL_ADMIN_CODE` to a long, private value for the first startup. Once that bootstrap admin exists, remove the variable; do not use a shared/default code.

- `access_codes`: hashed? **No**—codes are stored as plain text in this legacy schema. Protect the database file and backups accordingly.
- `portals`: saved Stalker portal URL, MAC, and display name.
- Catalogs and media are fetched from the portal; they are not stored in SQLite.

Use `DB_PATH` to place the database on persistent storage in production. Never publish `database.sqlite` or `.env`.

## API

- `GET /health` — health check.
- `POST /auth/verify` — validate an access code and return the administrator flag.
- `GET /portals` — list active saved portals; requires `X-Auth-Code`.
- `POST /stream-ticket` — request an opaque relay ticket for a configured HTTP(S) stream; requires `X-Auth-Code`.
- `/admin/users` and `/admin/portals` — administrator-only access-code and portal management.
- All `/stalker/*` catalog, handshake, and playback-resolution routes require a valid `X-Auth-Code`.
- `GET /stalker/channels` — live channels.
- `GET /stalker/vod/categories`, `GET /stalker/vod?cat=ID` — movie categories and items.
- `GET /stalker/series/categories`, `GET /stalker/series?cat=ID`, `GET /stalker/series/:id/seasons` — series, seasons, and episodes.
- `GET /stalker/stream` and `/stalker/series/episode/stream` — resolve a media command and issue a short-lived opaque playback ticket.
- `GET`, `HEAD`, `OPTIONS /stream?ticket=…` or `/stream.m3u8?ticket=…` — relay only a ticket issued by an authenticated endpoint; arbitrary `url=` targets are not accepted. HLS manifests and segments are ticketed through the same relay.

The bundled SQLite file contains login codes and portal connection details. Treat it as a secret. In production, serve the proxy over HTTPS, use a persistent volume, set `ALLOWED_ORIGIN` to the web client's exact origin, and use a long admin access code.
