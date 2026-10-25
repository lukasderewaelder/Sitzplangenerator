import { el } from "../core/basis.js";
import { SPEICHER_KEY } from "../core/konstanten.js";
import { pruefeUndMigriere } from "../core/schema.js";
import { S } from "../store.js";
import { showTab } from "../ui/bereiche.js";
import { renderClassTab } from "../ui/klasse-schueler.js";
import { ansage, toast, uhrzeit } from "../ui/meldungen.js";
import { renderAll } from "../ui/plan-status.js";
import { renderRoomTab } from "../ui/raum-editor.js";
import { closeSeatMenu } from "../ui/raum-panels.js";
import { ic } from "../ui/symbole.js";

export function loadLocal(){
  var raw;
  try{raw=localStorage.getItem(SPEICHER_KEY);}catch(e){return false;}
  if(!raw)return false;
  try{
    var r=pruefeUndMigriere(JSON.parse(raw));
    S.state=r.state;
    if(r.hinweise.length&&window.console)console.warn("Gespeicherter Stand wurde bereinigt:",r.hinweise);
    return true;
  }catch(e){
    /* nichts wegwerfen: den unlesbaren Stand getrennt aufbewahren */
    try{localStorage.setItem(SPEICHER_KEY+"_defekt_"+Date.now(),raw);}catch(e2){}
    S.ladeFehler=true;
    return false;
  }
}

/* ===================== Zustandsverwaltung: Autosave und Verlauf =====================
   Jede Änderung am Plan wird zentral erkannt: nach jeder Bedienung wird der Zustand mit
   dem zuletzt erfassten verglichen. Ist er anders, entsteht ein Schritt im Verlauf
   (Rückgängig/Wiederholen) und der Stand wird nach 300 ms gespeichert. So kann keine
   Änderung verloren gehen, auch wenn eine Stelle im Programm das Speichern vergisst. */
export var Store={basis:null,sicher:"",undo:[],redo:[],zeit:0,label:null,grenze:false,ersetzt:false,
  pruefTimer:null,speicherTimer:null,status:"gespeichert",fehlerText:"",zuletzt:null,max:60};
function kernJSON(){
  var o={};
  Object.keys(S.state).forEach(function(k){if(k!=="security")o[k]=S.state[k];});
  return JSON.stringify(o);
}
function sicherJSON(){return JSON.stringify(S.state.security||{});}
export function save(){pruefeBald();}                     /* alter Name: meldet „es hat sich etwas geändert“ */
export function schritt(label,opt){
  Store.label=label;Store.grenze=true;
  if(opt&&opt.ersetzt)Store.ersetzt=true;
  pruefeBald();
}
export function pruefeBald(){
  if(Store.pruefTimer)return;
  Store.pruefTimer=setTimeout(function(){Store.pruefTimer=null;pruefen();},0);
}
function pruefen(){
  if(Store.pruefTimer){clearTimeout(Store.pruefTimer);Store.pruefTimer=null;}
  if(Store.basis===null)return;
  var kern=kernJSON(),sec=sicherJSON();
  var kernNeu=(kern!==Store.basis),secNeu=(sec!==Store.sicher);
  if(kernNeu){
    var jetzt=Date.now();
    /* schnelle Folgeänderungen beim Tippen bilden einen gemeinsamen Schritt */
    if(Store.grenze||!Store.undo.length||jetzt-Store.zeit>900){
      Store.undo.push({json:Store.basis,sec:Store.sicher,label:Store.label||"Änderung",ersetzt:Store.ersetzt});
      if(Store.undo.length>Store.max)Store.undo.shift();
    }else if(Store.label){
      Store.undo[Store.undo.length-1].label=Store.label;
    }
    Store.redo=[];
    Store.zeit=jetzt;
    Store.basis=kern;
  }
  if(kernNeu||secNeu){Store.sicher=sec;speichernPlanen();}
  Store.label=null;Store.grenze=false;Store.ersetzt=false;
  verlaufKnoepfe();
}
function speichernPlanen(){
  setzeStatus("ungespeichert");
  clearTimeout(Store.speicherTimer);
  Store.speicherTimer=setTimeout(speichernJetzt,300);
}
export function speichernJetzt(){
  clearTimeout(Store.speicherTimer);Store.speicherTimer=null;
  try{
    localStorage.setItem(SPEICHER_KEY,JSON.stringify(S.state));
    Store.zuletzt=new Date();
    setzeStatus("gespeichert");
  }catch(e){
    Store.fehlerText=(e&&(e.name==="QuotaExceededError"||e.code===22))
      ?"Der Speicher dieses Browsers ist voll."
      :"Dieser Browser erlaubt hier kein Speichern (z. B. privates Fenster oder gesperrte Website-Daten).";
    var war=Store.status;
    setzeStatus("fehler");
    if(war!=="fehler")ansage("Speichern fehlgeschlagen. "+Store.fehlerText);
  }
}
export function sofortSichern(){
  pruefen();
  if(Store.speicherTimer||Store.status==="ungespeichert")speichernJetzt();
}
function setzeStatus(st){
  Store.status=st;
  var b=el("saveStatus");if(!b)return;
  b.className="savestat"+(st==="ungespeichert"?" dirty":st==="fehler"?" err":"");
  var txt=st==="gespeichert"?"Gespeichert":st==="ungespeichert"?"Speichert …":"Nicht gespeichert";
  b.innerHTML=ic(st==="gespeichert"?"check":st==="ungespeichert"?"dot":"alert")+'<span class="ss-txt">'+txt+"</span>";
  b.title=st==="fehler"?Store.fehlerText+" Antippen für Details."
    :(Store.zuletzt?"Automatisch gespeichert um "+uhrzeit(Store.zuletzt)+" Uhr":"Änderungen werden automatisch gespeichert.");
  b.setAttribute("aria-label",st==="fehler"?"Nicht gespeichert – Details":txt+". "+b.title);
}
export function speicherInit(){
  Store.basis=kernJSON();Store.sicher=sicherJSON();
  Store.undo=[];Store.redo=[];
  speichernJetzt();                              /* prüft zugleich, ob Speichern möglich ist */
  verlaufKnoepfe();
}
function verlaufKnoepfe(){
  var u=el("btnUndo"),r=el("btnRedo");if(!u||!r)return;
  var a=Store.undo[Store.undo.length-1],b=Store.redo[Store.redo.length-1];
  u.disabled=!a;r.disabled=!b;
  u.title=a?"Rückgängig: "+a.label+" (Strg+Z)":"Nichts rückgängig zu machen";
  r.title=b?"Wiederholen: "+b.label+" (Strg+Umschalt+Z)":"Nichts zu wiederholen";
  u.setAttribute("aria-label",a?"Rückgängig: "+a.label:"Rückgängig");
  r.setAttribute("aria-label",b?"Wiederholen: "+b.label:"Wiederholen");
}
export function rueckgaengig(){
  if(S.beamer)return;
  pruefen();
  var e=Store.undo.pop();if(!e)return;
  Store.redo.push({json:Store.basis,sec:Store.sicher,label:e.label,ersetzt:e.ersetzt});
  zustandLaden(e.json,e.ersetzt?e.sec:null);
  toast("Rückgängig: "+e.label);ansage("Rückgängig: "+e.label);
}
export function wiederholen(){
  if(S.beamer)return;
  pruefen();
  var e=Store.redo.pop();if(!e)return;
  Store.undo.push({json:Store.basis,sec:Store.sicher,label:e.label,ersetzt:e.ersetzt});
  zustandLaden(e.json,e.ersetzt?e.sec:null);
  toast("Wiederholt: "+e.label);ansage("Wiederholt: "+e.label);
}
function zustandLaden(json,secJson){
  var p=JSON.parse(json);
  if(secJson!==null&&secJson!==undefined){
    p.security=JSON.parse(secJson);
    if(JSON.stringify(p.security)!==JSON.stringify(S.state.security))S.unlocked=false;
  }else p.security=S.state.security;
  S.state=p;
  S.selected=null;S.edSel=null;if(S.multiSel)S.multiSel={};closeSeatMenu();
  el("planName").value=S.state.planName;
  if(S.tab==="class"&&S.state.security.hash&&!S.unlocked)showTab("plan");
  else neuZeichnen();
  Store.basis=kernJSON();Store.sicher=sicherJSON();Store.zeit=0;
  speichernPlanen();verlaufKnoepfe();
}
function neuZeichnen(){
  renderAll();
  if(S.tab==="room")renderRoomTab();
  else if(S.tab==="class")renderClassTab();
}
/* Jede Bedienung löst eine Prüfung aus; Klicks bilden eigene Schritte, Tippen wird zusammengefasst */
["click","change","pointerup","drop"].forEach(function(t){
  document.addEventListener(t,function(){Store.grenze=true;pruefeBald();},true);
});
["input","keyup"].forEach(function(t){document.addEventListener(t,pruefeBald,true);});
window.addEventListener("pagehide",sofortSichern);
document.addEventListener("visibilitychange",function(){if(document.hidden)sofortSichern();});
window.addEventListener("beforeunload",function(e){
  sofortSichern();
  if(Store.status==="fehler"&&Store.undo.length){e.preventDefault();e.returnValue="";}
});
S.fremdHinweis=0;
window.addEventListener("storage",function(e){
  if(e.key!==SPEICHER_KEY||!e.newValue||Date.now()-S.fremdHinweis<30000)return;
  S.fremdHinweis=Date.now();
  toast("Achtung: Der Plan ist noch in einem anderen Fenster geöffnet. Es gilt die jeweils zuletzt gespeicherte Änderung.","w");
});
document.addEventListener("keydown",function(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  var k=(e.key||"").toLowerCase();
  if(k!=="z"&&k!=="y")return;
  var t=e.target;
  if(t&&((t.tagName==="INPUT"&&!/^(checkbox|radio|button|color|file|range)$/i.test(t.type))||
         t.tagName==="TEXTAREA"||t.isContentEditable))return;       /* Texteingaben: normales Rückgängig des Feldes */
  if(!el("ov").hidden||!el("cov").hidden)return;
  e.preventDefault();
  if(k==="y"||(k==="z"&&e.shiftKey))wiederholen();else rueckgaengig();
});
