# Sitzplan-Generator

Sitzpläne für Klassenräume erstellen, nach Regeln mischen und drucken – als Web-App für PC und iPad, auch ohne Netz.

**Live:** https://lukasderewaelder.github.io/Sitzplangenerator/

## Was die App kann

- **Raum** als Raster einrichten: Einzel-, 2er-, 3er-, 4er-Tische, Tafel, Lehrertisch, Tische in 5°-Schritten drehen, Vorlagen und eigene Vorlagen.
- **Klasse** pflegen: Namen einzeln, per Einfügen aus Excel oder aus CSV/XLSX-Dateien laden.
- **Regeln:** Auseinander setzen (3 Stufen), Zusammen setzen, Einzelsitzen, „nah am Lehrertisch“, Platzmerkmale mit Wünschen, Mischen nach Geschlecht und Leistung.
- **Neu anordnen:** viele Zufallsvarianten, bewertet und durch Platztausch verbessert; Vorprüfung, Konflikte direkt beheben, Plätze fixieren.
- Von Hand umsetzen (Ziehen, Antippen, Tastatur), Lehrer- und Schülersicht, Beamer-Modus, Drucken/PDF (A4), Rückgängig/Wiederholen, Passwortschutz, verschlüsselte Sicherungen.

Die ausführliche Anleitung steht in der App (Symbol „?“).

## Auf PC und iPad nutzen

| Gerät | Installieren |
|---|---|
| iPad (Safari) | Teilen-Symbol → „Zum Home-Bildschirm“ |
| PC (Chrome/Edge) | Installieren-Symbol in der Adressleiste, oder Menü → „App installieren“ |

Nach dem ersten Besuch startet die App auch **ohne Netz**.

### Daten und Datenschutz

- Alle Pläne liegen **nur im Browserspeicher des jeweiligen Geräts**. Es gibt keinen Server und kein Konto; es werden keine Daten übertragen.
- Die installierte App hat einen **eigenen Speicher**, getrennt vom Browser-Tab (auf dem iPad: getrennt von Safari). Pläne aus dem Browser holst du so in die App: im Browser „Sicherung herunterladen“, in der App „Sicherung öffnen“.
- **Zwischen PC und iPad** wandern Pläne über die Sicherungsdatei, am bequemsten über einen Cloud-Ordner (iCloud Drive, OneDrive). Sicherungen lassen sich mit Passwort verschlüsseln.
- Safari kann Webseitendaten nach längerer Nichtnutzung löschen. Eine aktuelle Sicherungsdatei bleibt deshalb wichtig.
- **Dieses Repository ist öffentlich.** Echte Klassenlisten oder Sicherungen gehören nie hinein (`Sitzplan_*.json` und `*.sitzplan.json` sind ausgeschlossen). Die Testdaten in `tests/fixtures` sind erfunden.

## Entwicklung

Voraussetzung: Node.js ab Version 20.

```bash
npm install
npm run dev        # Entwicklungsserver mit Neuladen
npm run build      # baut die App zu index.html, sw.js, manifest und Symbolen im Repo-Stamm
npm test           # Unit-Tests (Vitest, jsdom)
npm run test:e2e   # Browser-Tests (Playwright; PC- und iPad-Ansichten)
npm run lint
npm run check      # alles zusammen
```

### Aufbau

```
app/
  index.html            HTML-Gerüst
  sw.template.js        Vorlage des Service Workers (wird beim Build versioniert)
  static/               Manifest und Symbole (werden in den Stamm kopiert)
  src/
    main.js             Verdrahtung und Start
    store.js            gemeinsamer veränderlicher Zustand (S)
    core/               Logik ohne Oberfläche: Datenformat und Migration, Geometrie, Regeln,
                        Solver, Vorprüfung, Konflikte beheben, Raumvorlagen
    io/                 Speicher und Verlauf, Sicherung, Verschlüsselung, Listen-Import, Druck, Gerät/Offline
    ui/                 Oberfläche: Plan, Raum-Editor, Klasse, Hilfe, Dialoge, Menü, Beamer …
    styles/             CSS, nach Bereichen getrennt
    assets/             Schrift „Sitzplan Gothic“
tests/
  unit/                 Vitest
  e2e/                  Playwright (Smoke, Verhaltensvergleich, PWA)
  fixtures/             erfundene Beispielklasse und Vergleichsdatei
tools/                  serve.mjs (Vorschau), icons.mjs (PNG-Symbole aus SVG)
```

### Veröffentlichen

GitHub Pages liefert den **Repo-Stamm** von `main` aus. Der gebaute Stand (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`) ist deshalb eingecheckt:

1. Änderungen in `app/` machen, `npm run check` ausführen.
2. Der Build ändert `index.html` und `sw.js` – beide mit einchecken.
3. Auf `main` pushen. Die CI baut erneut und bricht ab, wenn der eingecheckte Stand nicht zum Quelltext passt.

Die Versionsnummer steht in `package.json` und erscheint in der Hilfe der App.

### Kompatibilität der Sicherungen

Speicherschlüssel (`sitzplan_v2`), Datenformat (`SCHEMA = 4`) und Sicherungsformat (`sitzplan-sicherung`) sind gegenüber Version 3.3 unverändert. Ältere Sicherungen werden beim Öffnen automatisch umgewandelt; `tests/unit/schema.test.js` und `tests/e2e/golden.spec.mjs` sichern das gegen die Ausgangsfassung ab.

### Offline-Betrieb

Der Service Worker holt die Seite bei vorhandenem Netz immer frisch und legt sie nebenbei ab; ohne Netz startet die zuletzt abgelegte Fassung. Eine veraltete Mischung aus alter Seite und neuen Dateien kann so nicht entstehen.
