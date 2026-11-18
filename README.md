# Ausflugsbogen

Web-App für Lehrkräfte: Vorfälle pro Kind per Tipp erfassen, nach festen Regeln zählen, eine
Ampel mit Empfehlung anzeigen und einen druckbaren Einzelbogen für das Elterngespräch erstellen.

**Die App gibt nur eine Empfehlung. Die Entscheidung trifft das Team mit der Schulleitung.**

- Oberfläche auf Deutsch, für iPad, Handy und Laptop
- Kein Server, keine Konten, keine externen Anfragen (keine CDNs, keine Webfonts von außen, kein Tracking)
- Alle Daten bleiben auf dem Gerät (IndexedDB)
- Als App installierbar (PWA) und komplett offline nutzbar

## Schnellstart

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests (Vitest)
npm run build      # Typprüfung und Produktions-Build nach dist/
npm run check      # alles: Typen, ESLint, Prettier, Tests, Build
```

## Schrift: Grundschrift

Die App nutzt die **Grundschrift** (Regular und Bold). Die Schriftdateien sind nicht im Repository.
Lege sie hier ab, genau mit diesen Namen:

```
src/assets/fonts/Grundschrift-Regular.otf
src/assets/fonts/Grundschrift-Bold.otf
```

Danach neu bauen. Die Dateien werden lokal eingebunden und offline mitgespeichert.

**Fehlen die Dateien**, nutzt die App die Systemschrift und zeigt das sichtbar an (Hinweis unten
auf jeder Seite und unter Einstellungen, Schrift). Es wird nie still eine andere Webschrift geladen.

Die Grundschrift hat keine Zeichen wie « », Pfeile oder Häkchen. Die Oberfläche verwendet darum
nur gerade Anführungszeichen und keine Symbolzeichen.

## Regeln der Berechnung

Gezählt werden nur Einträge im Beobachtungszeitraum (von und bis jeweils inklusive; leeres "bis" =
offen, leeres "von" = ohne Untergrenze).

1. Anzahl n je Kriterium A1 bis D3
2. Stufe = (n >= s1) + (n >= s2) + (n >= s3), Standard 1, 3, 5
3. Punkte je Kriterium = Stufe mal Gewicht; Rohpunkte = Summe
4. Bonus = min(Anzahl P1 + P2, Obergrenze), Standard 8
5. Netto = max(0, Roh - Bonus)
6. Ampel: Netto >= 30 Rot, >= 20 Orange, >= 10 Gelb, sonst Grün
7. Sicherheitsprüfung: A1 + A2 + A3 >= 3 (0 schaltet ab), unabhängig von der Ampel
8. Empfehlungstext je Ampelfarbe, bei Sicherheitsprüfung mit Zusatzsatz
9. Maximal mögliche Punkte = Summe der Gewichte mal 3 (Standard 69)

Alle Werte und Texte sind in den Einstellungen änderbar.

## Projektaufbau

```
src/
  domain/      reine Fachlogik ohne UI: Kriterien, Berechnung, Datum, Beispieldaten, Validierung
  storage/     IndexedDB, Backup (JSON) mit Validierung und Migration, CSV-Export, Downloads
  state/       App-Zustand (Speichern bei jeder Änderung), Toast, Dialog, Router
  platform/    Schrift laden, Geräteerkennung, Service Worker registrieren
  ui/          Preact-Komponenten und die vier Bildschirme
  styles/      Bildschirm-CSS und Druck-CSS (A4)
build/sw-plugin.ts    erzeugt beim Build den Service Worker mit allen Dateien
scripts/make-icons.mjs erzeugt die App-Icons (npm run icons)
```

Die Daten sind versioniert (`schemaVersion`). Für spätere Änderungen am Datenformat wird in
`src/storage/validate.ts` (Funktion `migrate`) ein Migrationsschritt ergänzt.

## Deployment auf GitHub Pages

1. Repository auf GitHub anlegen und den Code auf `main` pushen.
2. Auf GitHub: Settings, Pages, Source: **GitHub Actions**.
3. Der Workflow `.github/workflows/deploy.yml` prüft, testet, baut und veröffentlicht bei jedem Push.

Der Basis-Pfad ist standardmäßig `/<repository-name>/`. Für eine eigene Domain unter Settings,
Secrets and variables, Actions, Variables eine Variable `BASE_PATH` mit Wert `/` anlegen.
Lokal: `BASE_PATH=/mein-pfad/ npx vite build`. Ohne `BASE_PATH` baut die App mit relativen Pfaden.

## Datenschutz

- Daten bleiben ausschließlich auf dem Gerät. Nichts wird übertragen.
- Nur Vornamen oder Kürzel verwenden.
- Backups enthalten Daten von Kindern: sicher aufbewahren.
- Nach dem Schuljahr alle Daten und Backups löschen (Einstellungen, Alle Daten löschen).
- Safari kann Daten von Webseiten nach etwa 7 Tagen ohne Nutzung löschen, wenn die App nicht
  installiert ist. Darum: zum Home-Bildschirm hinzufügen und regelmäßig ein Backup machen. Die App
  erinnert daran, wenn das letzte Backup älter als 14 Tage ist.
