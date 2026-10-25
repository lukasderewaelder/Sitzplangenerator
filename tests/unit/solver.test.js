import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { setzeZufall, zufallMitStartwert } from "../../app/src/core/basis.js";
import { buildAdj, usableSeats } from "../../app/src/core/geometrie.js";
import { pruefeUndMigriere } from "../../app/src/core/schema.js";
import { evaluate, generate, hardIssues } from "../../app/src/core/solver.js";
import { vorpruefung } from "../../app/src/core/vorpruefung.js";
import { reindex } from "../../app/src/core/zustand.js";
import { S } from "../../app/src/store.js";

const fixture = () => JSON.parse(readFileSync("tests/fixtures/klasse-7a.json", "utf8"));

function laden(roh = fixture()) {
  S.state = pruefeUndMigriere(roh).state;
  S.tab = "plan";
  S.selected = null;
  reindex();
}
const anordnung = () => JSON.parse(JSON.stringify(S.state.arrangement));

beforeEach(() => laden());
afterEach(() => setzeZufall(null));

describe("Anordnen", () => {
  it("bringt alle unter, jede Person genau einmal, gesperrte Plätze bleiben leer", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      laden();
      setzeZufall(zufallMitStartwert(seed));
      generate();
      const belegt = Object.values(S.state.arrangement);
      expect(belegt, `Startwert ${seed}`).toHaveLength(24);
      expect(new Set(belegt).size).toBe(24);
      for (const [k, m] of Object.entries(S.state.seatMeta)) {
        if (m.blocked) expect(S.state.arrangement[k]).toBeUndefined();
      }
    }
  });

  it("hält die harten Regeln der Beispielklasse ein", () => {
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      laden();
      setzeZufall(zufallMitStartwert(seed));
      generate();
      const plaetze = usableSeats();
      const bewertung = evaluate(S.state.arrangement, plaetze, buildAdj(plaetze));
      expect(hardIssues(bewertung.issues), `Startwert ${seed}`).toEqual([]);
    }
  });

  it("ist mit gleichem Startwert reproduzierbar", () => {
    setzeZufall(zufallMitStartwert(99));
    generate();
    const a = anordnung();
    laden();
    setzeZufall(zufallMitStartwert(99));
    generate();
    expect(anordnung()).toEqual(a);
  });

  it("liefert mit anderem Startwert andere Anordnungen", () => {
    setzeZufall(zufallMitStartwert(1));
    generate();
    const a = anordnung();
    laden();
    setzeZufall(zufallMitStartwert(2));
    generate();
    expect(anordnung()).not.toEqual(a);
  });

  it("lässt fixierte Plätze unangetastet", () => {
    setzeZufall(zufallMitStartwert(5));
    generate();
    const festerPlatz = Object.keys(S.state.arrangement)[0];
    const person = S.state.arrangement[festerPlatz];
    S.state.seatMeta[festerPlatz] = { tags: [], locked: true, blocked: false };
    for (const seed of [6, 7, 8]) {
      setzeZufall(zufallMitStartwert(seed));
      generate();
      expect(S.state.arrangement[festerPlatz], `Startwert ${seed}`).toBe(person);
      expect(Object.values(S.state.arrangement)).toHaveLength(24);
    }
  });

  it("setzt Personen mit Platzwunsch auf einen passenden Platz", () => {
    for (const seed of [21, 22, 23]) {
      laden();
      setzeZufall(zufallMitStartwert(seed));
      generate();
      const wuensche = S.state.students.filter((s) => s.requiredTags.length);
      expect(wuensche.length).toBeGreaterThan(0);
      for (const s of wuensche) {
        const platz = Object.keys(S.state.arrangement).find((k) => S.state.arrangement[k] === s.id);
        expect(S.state.seatMeta[platz].tags, `${s.name} (Startwert ${seed})`).toEqual(expect.arrayContaining(s.requiredTags));
      }
    }
  });
});

describe("Bewertung", () => {
  it("meldet nicht platzierte Personen", () => {
    const plaetze = usableSeats();
    const b = evaluate({}, plaetze, buildAdj(plaetze));
    expect(b.issues.filter((i) => i.type === "unplaced")).toHaveLength(24);
    expect(b.pen).toBeGreaterThan(0);
  });

  it("meldet zwei Personen einer Auseinander-Gruppe auf derselben Bank", () => {
    const plaetze = usableSeats();
    const adj = buildAdj(plaetze);
    // g_bl2: s_fix03 und s_fix04 mit Abstand "gross" – direkt nebeneinander setzen
    const paar = Object.entries(adj.bench).find(([, nachbarn]) => nachbarn.length);
    const arr = { [paar[0]]: "s_fix03", [paar[1][0]]: "s_fix04" };
    const b = evaluate(arr, plaetze, adj);
    expect(b.issues.some((i) => i.type === "black")).toBe(true);
  });
});

describe("Vorprüfung", () => {
  it("meldet bei der Beispielklasse nur den gewollten Widerspruch", () => {
    const v = vorpruefung();
    expect(v.n).toBe(24);
    // einziger Hinweis: Hannes Hahn soll allein sitzen, steht aber in einer Zusammen-Gruppe (Absicht der Beispieldaten)
    expect(v.H.filter((h) => h.stufe === "warn").map((h) => h.text)).toEqual([
      "Hannes Hahn soll allein sitzen und ist gleichzeitig in einer Zusammen-Gruppe.",
    ]);
  });

  it("warnt, wenn es weniger Plätze als Personen gibt", () => {
    const roh = fixture();
    roh.tables = roh.tables.slice(0, 5);
    laden(roh);
    const v = vorpruefung();
    expect(v.pl).toBeLessThan(v.n);
    expect(v.warn).toBeGreaterThan(0);
    expect(v.H.map((h) => h.text).join(" ")).toMatch(/nutzbare Plätze/);
  });
});
