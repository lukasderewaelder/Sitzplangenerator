/* Begriffe der Oberfläche für die Regelstufen (intern bleiben stark/moderat/schwach) */
export var ABSTAND={stark:"groß",moderat:"mittel",schwach:"klein"};
export var NAEHE={stark:"gleiche Bank",moderat:"nebeneinander",schwach:"in der Nähe"};
export function stufenText(art,st){return art==="bl"?"Abstand "+(ABSTAND[st]||"mittel"):"Nähe: "+(NAEHE[st]||"nebeneinander");}

export var GENDERS={
  w:{label:"weiblich",short:"w",color:"#b8528a"},
  m:{label:"männlich",short:"m",color:"#3d72a4"},
  d:{label:"divers",short:"d",color:"#6a8f3c"},
  x:{label:"ohne Angabe",short:"–",color:"#9a9a9a"}
};
export var LEVELS={1:"benötigt Unterstützung",2:"mittel",3:"stark"};
/* im Plan und im Ausdruck ausgeschrieben statt L1–L3 */
export var LEVEL_TXT={1:"Unterstützung",2:"mittel",3:"stark"};
export function hasOwn(o,k){return (typeof k==="string"||typeof k==="number")&&Object.prototype.hasOwnProperty.call(o,k);}

/* Datenformat: Version 3 (Version 1 = Raster ohne Tische, Version 2 = Tische) */
export var SCHEMA=4;
export var SPEICHER_KEY="sitzplan_v2";              /* Schlüssel bleibt, damit vorhandene Pläne erhalten bleiben */
export var BEAMER_KEY="sitzplan_beamer";
export var DRUCK_KEY="sitzplan_druckwahl";
