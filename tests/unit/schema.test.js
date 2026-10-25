import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pruefeUndMigriere } from "../../app/src/core/schema.js";
import { SCHEMA } from "../../app/src/core/konstanten.js";

const lies = (n) => JSON.parse(readFileSync(`tests/fixtures/${n}`, "utf8"));
const ohneKopf = (o) => {
  const k = JSON.parse(JSON.stringify(o));
  delete k.format;
  delete k.gespeichertAm;
  // Die App legt Platzangaben beim Zeichnen "auf Vorrat" an; dort ohne Besonderheit sind sie ohne Bedeutung.
  for (const [schluessel, m] of Object.entries(k.seatMeta || {})) {
    if (!m.locked && !m.blocked && !(m.tags || []).length) delete k.seatMeta[schluessel];
  }
  return k;
};

describe("Datenformat und Migration", () => {
  it("liest die Beispielklasse und liefert den Stand der Ausgangsfassung v3.3", () => {
    const r = pruefeUndMigriere(lies("klasse-7a.json"));
    expect(r.version).toBe(SCHEMA);
    expect(ohneKopf(r.state)).toEqual(ohneKopf(lies("klasse-7a.golden.json")));
  });

  it("ist idempotent: erneutes Migrieren ändert nichts", () => {
    const einmal = pruefeUndMigriere(lies("klasse-7a.json")).state;
    const zweimal = pruefeUndMigriere(JSON.parse(JSON.stringify(einmal))).state;
    expect(zweimal).toEqual(einmal);
  });

  it("verändert die Eingabe nicht", () => {
    const roh = lies("klasse-7a.json");
    const kopie = JSON.parse(JSON.stringify(roh));
    pruefeUndMigriere(roh);
    expect(roh).toEqual(kopie);
  });

  it("lehnt Sicherungen aus einer neueren Fassung ab", () => {
    const roh = lies("klasse-7a.json");
    roh.v = SCHEMA + 1;
    expect(() => pruefeUndMigriere(roh)).toThrow(/neueren Fassung/);
  });

  it("lehnt Dateien ohne Sitzplan mit einer lesbaren Meldung ab", () => {
    for (const roh of [{}, [], "text", { foo: 1 }, null]) {
      let fehler;
      try {
        pruefeUndMigriere(roh);
      } catch (e) {
        fehler = e;
      }
      expect(fehler, JSON.stringify(roh)).toBeTruthy();
      expect(fehler.datenFehler).toBe(true);
    }
  });

  it("nimmt eine Klassenliste ohne Raum an und setzt das Standardzimmer ein", () => {
    const r = pruefeUndMigriere({ students: [{ name: "Anna Adler" }, { name: "Ben Braun" }] });
    expect(r.state.students.map((s) => s.name)).toEqual(["Anna Adler", "Ben Braun"]);
    expect(r.state.tables.length).toBeGreaterThan(0);
    expect(r.hinweise.length).toBeGreaterThan(0);
  });

  it("packt Sicherungen aus einer Hülle aus", () => {
    const roh = lies("klasse-7a.json");
    const r = pruefeUndMigriere({ state: roh });
    expect(r.state.students).toHaveLength(24);
  });

  it("bereinigt unbekannte Verweise statt abzustürzen", () => {
    const roh = lies("klasse-7a.json");
    roh.blacklist[0].members.push("gibt_es_nicht");
    roh.arrangement = { "kein_tisch#0": "s_fix00" };
    const r = pruefeUndMigriere(roh);
    expect(r.state.blacklist[0].members).not.toContain("gibt_es_nicht");
    expect(r.state.arrangement["kein_tisch#0"]).toBeUndefined();
  });
});
