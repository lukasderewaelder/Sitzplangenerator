import { el } from "../core/basis.js";
import { BEAMER_KEY } from "../core/konstanten.js";
import { sofortSichern } from "../io/speicher.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { ansage, toast } from "./meldungen.js";
import { menuZu } from "./menue.js";
import { requireUnlock } from "./passwort.js";
import { dndClear } from "./plan-dnd.js";
import { closeSeatMenu } from "./raum-panels.js";

/* ===================== Beamer-Modus =====================
   Zeigt nur den Sitzplan in Schülersicht: keine Leisten, keine Regelmarkierungen,
   Platzmerkmale, Hinweise, Geschlecht oder Leistungsstärke. Bearbeiten ist gesperrt.
   Verlassen nur mit Passwort, falls eines gesetzt ist. Übersteht ein Neuladen. */
S.beamer=null;                               /* null = aus, sonst {view:Ansicht davor} */
S.letzteAktivitaet=Date.now();
function beamerKnopf(){
  el("btnBeamer").setAttribute("aria-pressed",S.beamer?"true":"false");
  el("btnBeamerExit").hidden=!S.beamer;
  el("btnBeamerExit").title="Beamer-Modus beenden"+(S.state.security.hash?" (Passwort nötig)":"");
}
export function beamerStarten(leise,vorher){
  if(S.beamer)return;
  sofortSichern();
  menuZu(false);
  if(!el("cov").hidden){el("cov").hidden=true;S.pendingYes=null;S.pendingNo=null;}
  el("ov").hidden=true;
  closeSeatMenu();
  if(S.dnd)dndClear();
  S.beamer={view:(vorher==="student"||vorher==="teacher")?vorher:S.view};
  S.unlocked=false;S.selected=null;S.hervor=null;
  S.view="student";
  document.body.classList.add("beamer");
  el("planName").readOnly=true;
  beamerKnopf();
  try{localStorage.setItem(BEAMER_KEY,S.beamer.view);}catch(e){}
  showTab("plan");
  if(!leise){
    var d=document.documentElement;
    if(d.requestFullscreen){try{var p=d.requestFullscreen();if(p&&p.catch)p.catch(function(){});}catch(e){}}
    toast("Beamer-Modus: nur die Schülersicht ist zu sehen."+(S.state.security.hash?" Beenden nur mit Passwort.":""));
  }
  ansage("Beamer-Modus eingeschaltet.");
}
export function beamerBeenden(){
  if(!S.beamer)return;
  requireUnlock(function(){
    var v=S.beamer.view;S.beamer=null;
    S.view=v||"teacher";
    document.body.classList.remove("beamer");
    el("planName").readOnly=false;
    beamerKnopf();
    try{localStorage.removeItem(BEAMER_KEY);}catch(e){}
    if(document.fullscreenElement&&document.exitFullscreen){try{var p=document.exitFullscreen();if(p&&p.catch)p.catch(function(){});}catch(e){}}
    showTab("plan");
    toast("Beamer-Modus beendet.");
    setTimeout(function(){el("btnBeamer").focus();},40);
  },"Beamer-Modus beenden","Zum Verlassen des Beamer-Modus bitte das Passwort eingeben.");
}
