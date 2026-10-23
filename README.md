# ⚡ Monster Energy Pausen-Tracker (`MonsterList`)

Eine schnelle, statische Web-App für **GitHub Pages**, um mit Kollegen in der Pause getestete und geplante **Monster Energy** Sorten zu verwalten, mit Bildern & Nährwerten anzuschauen und gegenseitig auf einer Skala von **1–10** zu bewerten.

---

## ✨ Features

- **✅ Schon getestet & ⏳ Demnächst dran:** Übersichtliche Trennung zwischen bereits verkosteten Dosen und Sorten, die für die nächsten Pausen geplant sind.
- **🖼️ 31 Monster-Sorten & Bilder vorinstalliert:** Alle Bilder liegen im Ordner `res/`, alle Daten in `data/monsters.json` (inkl. Koffein, Zuckergehalt & Geschmacksbeschreibung).
- **⭐ Bewerten (1–10 Punkte) & Kommentare der Kollegen lesen:**
  - Klick auf ein Monster zeigt den Gesamtdurchschnitt sowie alle Einzelbewertungen und Geschmacksnotizen der Kollegen.
  - Eigene Bewertung direkt mit Name, Punktzahl (1–10) und Kommentar abgeben.
- **🏆 Bestenliste (Ranking):** Podium (Top 3) und Gesamtrangliste aller getesteten Monster – auch nach einzelnen Kollegen filterbar.
- **➕ Einfaches Hinzufügen neuer Monster:**
  - Direkt über den Button **„+ Neues Monster / Verwalten“** auf der Webseite oder durch Ergänzen eines Eintrags in `data/monsters.json`.

---

## 🚀 Auf GitHub Pages hosten (In 2 Minuten)

1. Erstelle auf GitHub ein neues **Public Repository** (z. B. `MonsterList`).
2. Verbinde dieses lokale Repository und pushe den Code:
   ```bash
   git remote add origin https://github.com/<DEIN-GITHUB-NAME>/MonsterList.git
   git push -u origin main
   ```
3. Öffne auf GitHub **Settings → Pages**:
   - Unter **Build and deployment** wähle **Deploy from a branch**.
   - Wähle Branch `main` und Ordner `/ (root)` → **Save**.
4. Deine Seite ist kurz darauf unter `https://<DEIN-GITHUB-NAME>.github.io/MonsterList/` erreichbar!

---

## 🤝 Wie funktionieren die gemeinsamen Bewertungen auf GitHub Pages?

Da GitHub Pages rein statisch ist, kombiniert die App zwei Wege:

1. **Über GitHub Issues + Auto-Sync (Empfohlen auf GitHub Pages):**
   - Klickt ein Kollege im Bewertungsformular auf **„🚀 Auf GitHub für alle teilen“**, öffnet sich ein fertig ausgefülltes GitHub-Issue.
   - **Sofort sichtbar:** Die Webseite liest offene Issues live über die GitHub API aus – die Bewertung ist sofort für alle sichtbar.
   - **Automatisch in `data/monsters.json` gespeichert:** Die mitgelieferte GitHub Action (`.github/workflows/sync-issues-to-json.yml`) trägt die Bewertung automatisch fest in `data/monsters.json` ein und schließt das Issue wieder.
2. **Ohne GitHub-Account (Direkt über `data/monsters.json`):**
   - Du kannst Bewertungen und neue Monster auf der Seite eingeben und unter **„Team-Sync → 💾 monsters.json herunterladen“** die fertige Datei herunterladen und ins Repo committen.
   - Oder du bearbeitest `data/monsters.json` direkt im Texteditor:

```json
{
  "id": 32,
  "name": "Monster Ultra Violet",
  "category": "Ultra (Zero Sugar)",
  "status": "upcoming",
  "image": "res/MeinNeuesBild.webp",
  "caffeine": 150,
  "sugar": 0,
  "taste": "Traube, Zitrus, zuckerfrei",
  "ratings": [
    {
      "user": "Max",
      "score": 9,
      "comment": "Mega erfrischend in der Pause!",
      "date": "2026-10-23"
    }
  ]
}
```
