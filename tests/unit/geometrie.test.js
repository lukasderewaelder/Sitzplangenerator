import { describe, expect, it } from "vitest";
import {
  allSeats, buildAdj, imRaum, polyUeberlappen, rechteckForm, sitzMitte, tableCells, tischForm,
  tischMasse, tischZellen, viertelLagen, winkelNorm,
} from "../../app/src/core/geometrie.js";
import { S } from "../../app/src/store.js";
import { defaultState } from "../../app/src/core/zustand.js";

const tisch = (o) => ({ id: "t", x: 0, y: 0, seats: 2, dir: "h", ...o });

describe("Tische und Plätze", () => {
  it("liefert die Rasterfelder je Richtung", () => {
    expect(tableCells(tisch({ x: 2, y: 3, seats: 3 }))).toEqual([{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }]);
    expect(tableCells(tisch({ x: 2, y: 3, seats: 2, dir: "v" }))).toEqual([{ x: 2, y: 3 }, { x: 2, y: 4 }]);
  });
  it("misst quer und längs", () => {
    expect(tischMasse(tisch({ seats: 4 }))).toEqual({ w: 4, h: 1 });
    expect(tischMasse(tisch({ seats: 4, dir: "v" }))).toEqual({ w: 1, h: 4 });
  });
  it("rundet Winkel auf 5° und in den Bereich −85° … 90°", () => {
    expect(winkelNorm(0)).toBe(0);
    expect(winkelNorm(47)).toBe(45);
    expect(winkelNorm(-90)).toBe(90);
    expect(winkelNorm(180)).toBe(0);
    expect(winkelNorm(95)).toBe(-85);
    expect(winkelNorm("")).toBe(0);
    expect(winkelNorm("abc")).toBe(0);
  });
  it("Vierteldrehung wechselt die Richtung und kehrt nach viermal zurück", () => {
    let t = tisch({ x: 3, y: 4, seats: 3 });
    const start = { x: t.x, y: t.y, dir: t.dir };
    for (let i = 0; i < 4; i++) {
      const v = viertelLagen(t);
      expect(v.dir).not.toBe(t.dir);
      t = { ...t, dir: v.dir, x: v.lagen[0].x, y: v.lagen[0].y };
    }
    expect({ x: t.x, y: t.y, dir: t.dir }).toEqual(start);
  });
  it("Sitzmitte folgt der Drehung um die Tischmitte", () => {
    const t = tisch({ x: 0, y: 0, seats: 2 });
    expect(sitzMitte(t, 0)).toEqual({ x: 0.5, y: 0.5 });
    const g = sitzMitte({ ...t, winkel: 90 }, 0);
    expect(g.x).toBeCloseTo(1, 6);
    expect(g.y).toBeCloseTo(0, 6);
  });
  it("gedrehte Tische berühren mehr Felder als gerade", () => {
    const t = tisch({ x: 2, y: 2, seats: 4 });
    expect(tischZellen(t)).toHaveLength(4);
    expect(tischZellen({ ...t, winkel: 45 }).length).toBeGreaterThan(4);
  });
});

describe("Überlappung", () => {
  it("erkennt Überlappung, aber nicht bloßes Berühren", () => {
    const a = rechteckForm(0, 0, 2, 1), b = rechteckForm(1, 0, 2, 1), c = rechteckForm(2, 0, 2, 1);
    expect(polyUeberlappen(a, b)).toBe(true);
    expect(polyUeberlappen(a, c)).toBe(false);
  });
  it("Tische mit Einzug dürfen sich berühren", () => {
    const a = tischForm(tisch({ x: 0, y: 0 }), 0, 0, 0.06), b = tischForm(tisch({ x: 2, y: 0 }), 2, 0, 0.06);
    expect(polyUeberlappen(a, b)).toBe(false);
  });
  it("prüft die Raumgrenzen", () => {
    expect(imRaum(rechteckForm(0, 0, 2, 1), 10, 10)).toBe(true);
    expect(imRaum(rechteckForm(9, 0, 2, 1), 10, 10)).toBe(false);
  });
});

describe("Nachbarschaft im Standardraum", () => {
  it("Doppelbank: Nachbar auf der Bank, Nachbar über den Gang nur als sideGap", () => {
    S.state = defaultState();
    const plaetze = allSeats();
    expect(plaetze).toHaveLength(30);
    const adj = buildAdj(plaetze);
    const erste = S.state.tables[0];
    const k0 = erste.id + "#0", k1 = erste.id + "#1";
    expect(adj.bench[k0]).toContain(k1);
    expect(adj.bench[k1]).toContain(k0);
    const ueberGang = S.state.tables[1].id + "#0";
    expect(adj.bench[k1]).not.toContain(ueberGang);
    expect(adj.sideGap[k1]).toContain(ueberGang);
  });
  it("Beziehungen sind symmetrisch", () => {
    S.state = defaultState();
    const adj = buildAdj(allSeats());
    for (const art of ["bench", "sideGap", "front", "diag"]) {
      for (const [k, liste] of Object.entries(adj[art])) {
        for (const n of liste) expect(adj[art][n], `${art} ${k}->${n}`).toContain(k);
      }
    }
  });
});
