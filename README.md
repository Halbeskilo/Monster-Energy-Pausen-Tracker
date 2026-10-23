# ⚡ Monster Energy Pausen-Tracker (`Monster-Energy-Pausen-Tracker`)

Eine schnelle Web-App auf **GitHub Pages** mit einer kostenlosen **Cloudflare D1 SQL-Datenbank**, um mit Kollegen in der Pause getestete und geplante **Monster Energy** Sorten zu verwalten, mit Bildern & Nährwerten anzuschauen und gegenseitig auf einer Skala von **1–10** zu bewerten.

👉 **Live-Seite:** `https://halbeskilo.github.io/Monster-Energy-Pausen-Tracker/`

---

## 🔐 Automatisch deployen mit GitHub Secrets (empfohlen)

Der Workflow [`.github/workflows/deploy-cloudflare.yml`](./.github/workflows/deploy-cloudflare.yml) legt D1 an, spielt `schema.sql` ein, deployt den Worker und trägt die Worker-URL automatisch in `data/monsters.json` ein. Der Token liegt dabei nur verschlüsselt in GitHub.

1. **Cloudflare API-Token erstellen:** [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → *Create Token* → *Custom Token* mit
   - `Account` → `D1` → `Edit`
   - `Account` → `Workers Scripts` → `Edit`
2. **workers.dev-Subdomain festlegen** (nur bei neuem Account): einmal im Dashboard **Workers & Pages** öffnen und die Subdomain bestätigen.
3. **Secrets in GitHub anlegen:** Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `CLOUDFLARE_API_TOKEN` = der Token aus Schritt 1
   - `CLOUDFLARE_ACCOUNT_ID` = deine Account-ID (Dashboard → Workers & Pages, rechte Seitenleiste)

   Alternativ per GitHub CLI:
   ```powershell
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```
4. **Workflow starten:** Repo → **Actions → Deploy Cloudflare D1 + Worker → Run workflow**.
   Danach läuft er automatisch bei jeder Änderung an `cloudflare/worker.js` oder `cloudflare/schema.sql`.

> Terraform ([`cloudflare/terraform/`](./cloudflare/terraform)) ist für lokale Deployments gedacht. In GitHub Actions wird bewusst `wrangler` genutzt, weil Terraform dort einen Remote-State bräuchte – sonst würde jeder Lauf versuchen, die Datenbank neu anzulegen.

---

## ☁️ Cloudflare D1 Datenbank manuell einrichten (Alternative)

Da du bereits einen Cloudflare-Account hast, kannst du alles direkt im Browser im **Cloudflare Dashboard** (ohne Kommandozeile) einrichten:

### Schritt 1: D1-Datenbank erstellen & Tabellen anlegen
1. Logge dich auf [dash.cloudflare.com](https://dash.cloudflare.com/) ein.
2. Klicke links im Menü auf **Workers & Pages** → **D1 SQL Database** (oder **Storage & Databases → D1**).
3. Klicke auf **Create Database**, nenne sie **`monster-db`** und klicke auf **Create**.
4. Öffne deine neue Datenbank `monster-db`, wechsle auf den Reiter **Console** (SQL-Konsole).
5. Kopiere den gesamten Inhalt aus der Datei [`cloudflare/schema.sql`](./cloudflare/schema.sql) in das SQL-Feld und klicke auf **Execute**.
   *(Damit sind die Tabellen `monsters` und `ratings` sowie alle 31 Monster-Sorten sofort in deiner Datenbank angelegt!)*

### Schritt 2: Kostenlosen Cloudflare Worker als API erstellen
1. Gehe links im Cloudflare-Menü auf **Workers & Pages** → **Create** → **Create Worker**.
2. Vergib einen Namen, z. B. **`monster-pausen-api`**, und klicke auf **Deploy**.
3. Klicke danach auf **Edit code** (oben rechts):
   - Lösche den Beispiel-Code im Editor komplett.
   - Kopiere den gesamten Inhalt aus [`cloudflare/worker.js`](./cloudflare/worker.js) hinein.
   - Klicke oben rechts auf **Deploy**.

### Schritt 3: Datenbank (`monster-db`) mit dem Worker verbinden
1. Gehe in deinem Worker `monster-pausen-api` auf den Tab **Settings** → **Bindings** (oder **Variables and Secrets / Bindings**).
2. Klicke auf **+ Add** → wähle **D1 database**.
3. Trage exakt ein:
   - **Variable name:** `DB` *(Wichtig: großgeschrieben `DB`)*
   - **D1 database:** Wähle deine `monster-db` aus.
4. Klicke auf **Deploy / Save**.

### Schritt 4: Worker-URL in der App hinterlegen
Dein Worker hat jetzt eine eigene URL (steht oben in der Worker-Übersicht, z. B. `https://monster-pausen-api.<dein-subdomain>.workers.dev`).

- **Zum sofortigen Testen:** Klicke auf deiner Webseite oben rechts auf **„D1 verbinden“**, füge die URL ein und klicke auf **Verbinden & Testen**.
- **Damit kein Kollege etwas eingeben muss:** Trage die URL einmal fest in [`data/monsters.json`](./data/monsters.json) in Zeile 5 bei `"apiUrl": "https://monster-pausen-api....workers.dev"` ein und pushe die Änderung zu GitHub!

