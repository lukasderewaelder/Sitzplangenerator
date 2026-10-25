import { describe, expect, it, afterEach } from "vitest";
import { esc, rnd, setzeZufall, shuffle, uid, zufallMitStartwert } from "../../app/src/core/basis.js";
import { doppelteNamen, nameTeilen, neuePerson, vollName } from "../../app/src/core/zustand.js";

afterEach(() => setzeZufall(null));

describe("Zufall", () => {
  it("liefert mit gleichem Startwert dieselbe Folge", () => {
    const a = zufallMitStartwert(7), b = zufallMitStartwert(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("liegt immer in [0, 1)", () => {
    const z = zufallMitStartwert(123);
    for (let i = 0; i < 1000; i++) {
      const w = z();
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(1);
    }
  });
  it("kann ersetzt werden und wirkt auf shuffle und uid", () => {
    setzeZufall(zufallMitStartwert(1));
    const x = shuffle([1, 2, 3, 4, 5, 6]);
    setzeZufall(zufallMitStartwert(1));
    expect(shuffle([1, 2, 3, 4, 5, 6])).toEqual(x);
    setzeZufall(() => 0.5);
    expect(rnd()).toBe(0.5);
    expect(uid("t")).toMatch(/^t_/);
  });
  it("shuffle verändert die Eingabe nicht und behält alle Elemente", () => {
    const ein = [1, 2, 3, 4, 5];
    const aus = shuffle(ein);
    expect(ein).toEqual([1, 2, 3, 4, 5]);
    expect([...aus].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("Text", () => {
  it("esc maskiert HTML-Zeichen", () => {
    expect(esc('<a href="x">&\'</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
  it("teilt Namen in Vor- und Nachname", () => {
    expect(nameTeilen("Anna Maria Schmidt")).toEqual({ vor: "Anna Maria", nach: "Schmidt" });
    expect(nameTeilen("Schmidt, Anna")).toEqual({ vor: "Anna", nach: "Schmidt" });
    expect(nameTeilen("  Ben  ")).toEqual({ vor: "Ben", nach: "" });
  });
  it("erkennt gleiche Namen unabhängig von Groß-/Kleinschreibung", () => {
    const a = neuePerson("Anna", "Adler"), b = neuePerson("anna", "ADLER"), c = neuePerson("Ben", "Braun");
    const d = doppelteNamen([a, b, c]);
    expect(d).toHaveLength(1);
    expect(d[0]).toHaveLength(2);
    expect(vollName("Anna", "")).toBe("Anna");
  });
});
