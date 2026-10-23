# ⚡ Monster Energy Pausen-Tracker

Web-App auf **GitHub Pages** mit einer kostenlosen **Cloudflare D1**-Datenbank: getestete und geplante **Monster Energy**-Sorten verwalten, mit Bild & Nährwerten anschauen und gemeinsam mit den Kollegen von **1–10** bewerten.

👉 **Live:** https://halbeskilo.github.io/Monster-Energy-Pausen-Tracker/
👉 **API:** https://monster-pausen-api.max-200.workers.dev/api/data

## Benutzung

- **Bewerten:** Monster anklicken → Name, Punkte, Kommentar → speichern. Das Monster wird dabei automatisch auf „Schon getestet“ gesetzt.
- **Status ändern:** Monster anklicken → „Status für die Pause“ → *Schon getestet* / *Demnächst dran* → „Status ändern“.
- **Neues Monster:** oben rechts **„+ Neues Monster“**.

Alles wird direkt in D1 gespeichert und ist sofort für alle sichtbar. Ist die Datenbank nicht erreichbar, speichert die Seite lokal im Browser und lädt die Änderungen beim nächsten Verbinden automatisch hoch.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html`, `styles.css`, `app.js` | Frontend (GitHub Pages) |
| `data/monsters.json` | `meta.apiUrl` (Worker-URL) + Basisdaten als Fallback |
| `res/` | Dosenbilder |
| `cloudflare/worker.js` | REST-API (Cloudflare Worker) |
| `cloudflare/schema.sql` | Tabellen + Start-Monster für D1 |
| `.github/workflows/deploy-cloudflare.yml` | Deployt D1 + Worker |

## Deployment

Der Workflow **Deploy Cloudflare D1 + Worker** läuft automatisch bei Änderungen an `cloudflare/worker.js`, `cloudflare/schema.sql` oder am Workflow selbst (oder manuell über *Actions → Run workflow*). Er legt die D1-Datenbank an (falls nötig), spielt `schema.sql` ein, deployt den Worker und trägt die Worker-URL in `data/monsters.json` ein.

Benötigte Repository-Secrets (*Settings → Secrets and variables → Actions*):

- `CLOUDFLARE_API_TOKEN` – Custom Token mit `Account → D1 → Edit` und `Account → Workers Scripts → Edit`
- `CLOUDFLARE_ACCOUNT_ID`
