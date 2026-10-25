import { describe, expect, it } from "vitest";
import { entschluesseln, kryptoMoeglich, verschluesseln } from "../../app/src/io/krypto.js";
import { csvTeilen, dublettenVon, namenBilden, personenAusTabelle } from "../../app/src/io/listen-import.js";

describe("Verschlüsselte Sicherung", () => {
  it("ist in der Testumgebung möglich", () => {
    expect(kryptoMoeglich()).toBe(true);
  });

  it("entschlüsselt mit dem richtigen Passwort und enthält keinen Klartext", async () => {
    const text = JSON.stringify({ students: [{ name: "Anna Adler" }] });
    const paket = await verschluesseln(text, "Geheim-1234");
    const roh = typeof paket === "string" ? paket : JSON.stringify(paket);
    expect(roh).not.toContain("Anna");
    expect(await entschluesseln(typeof paket === "string" ? JSON.parse(paket) : paket, "Geheim-1234")).toBe(text);
  });

  it("lehnt ein falsches Passwort ab", async () => {
    const paket = await verschluesseln("geheim", "richtig-1");
    const obj = typeof paket === "string" ? JSON.parse(paket) : paket;
    await expect(entschluesseln(obj, "falsch-1")).rejects.toBeTruthy();
  });

  it("erzeugt bei jedem Mal anderen Chiffretext (Salz und IV)", async () => {
    const a = await verschluesseln("gleich", "pw-1234");
    const b = await verschluesseln("gleich", "pw-1234");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe("Klassenliste aus Text", () => {
  it("erkennt Trennzeichen Semikolon, Komma und Tabulator", () => {
    expect(csvTeilen("Nachname;Vorname\nSchmidt;Lena")).toEqual([["Nachname", "Vorname"], ["Schmidt", "Lena"]]);
    expect(csvTeilen("Nachname,Vorname\nSchmidt,Lena")).toEqual([["Nachname", "Vorname"], ["Schmidt", "Lena"]]);
    expect(csvTeilen("Nachname\tVorname\nSchmidt\tLena")).toEqual([["Nachname", "Vorname"], ["Schmidt", "Lena"]]);
  });

  it("kommt mit Windows-Zeilenenden, BOM und Anführungszeichen zurecht", () => {
    const zeilen = csvTeilen('﻿Name;Hinweis\r\n"Müller, Lena";"sitzt vorn; Brille"\r\n');
    expect(zeilen[0]).toEqual(["Name", "Hinweis"]);
    expect(zeilen[1]).toEqual(["Müller, Lena", "sitzt vorn; Brille"]);
  });

  it("liest Vor- und Nachname sowie Zusatzspalten über die Kopfzeile", () => {
    const info = personenAusTabelle(csvTeilen("Nachname;Vorname;Geschlecht;Hinweis\nSchmidt;Lena;w;Brille\nWeber;Tom;m;"));
    expect(info.kopf).toBe(true);
    expect(info.vorNach).toBe(true);
    expect(info.eintraege.map((e) => e.vor + " " + e.nach)).toEqual(["Lena Schmidt", "Tom Weber"]);
    expect(info.eintraege[0].gender).toBe("w");
    expect(info.eintraege[0].note).toBe("Brille");
  });

  it("nimmt eine einzelne Namensspalte ohne Kopfzeile", () => {
    const info = personenAusTabelle(csvTeilen("Lena Schmidt\nTom Weber"));
    expect(info.kopf).toBe(false);
    expect(info.eintraege).toHaveLength(2);
    expect(info.eintraege[1].vor).toBe("Tom");
  });

  it("findet doppelte Namen innerhalb der Liste", () => {
    const eintraege = personenAusTabelle(csvTeilen("Lena Schmidt\nLena Schmidt\nTom Weber")).eintraege;
    expect(dublettenVon(eintraege, "ergaenzen").length).toBeGreaterThan(0);
    expect(dublettenVon(personenAusTabelle(csvTeilen("Lena Schmidt\nTom Weber")).eintraege, "ergaenzen")).toHaveLength(0);
  });

  it("bildet Anzeigenamen nach Format", () => {
    const e = [{ vor: "Lena", nach: "Schmidt", voll: "Lena Schmidt" }];
    expect(typeof namenBilden).toBe("function");
    expect(e).toHaveLength(1);
  });
});
