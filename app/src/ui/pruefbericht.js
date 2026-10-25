import { el, esc } from "../core/basis.js";
import { konfliktBeheben, problemSchluessel } from "../core/beheben.js";
import { stufenText } from "../core/konstanten.js";
import { lehrerText, sName, tagById } from "../core/regeln.js";
import { generate, hardIssues } from "../core/solver.js";
import { offeneRegeln, vorpruefung } from "../core/vorpruefung.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { drawGroups, gruppeOffen } from "./klasse-regeln.js";
import { toast } from "./meldungen.js";
import { closeModal, openModal } from "./modal.js";
import { requireUnlock } from "./passwort.js";
import { renderRoom } from "./plan-ansicht.js";
import { ic } from "./symbole.js";

/* ---- Konflikte als Arbeitswerkzeug: jede Zeile führt direkt zur Ursache ---- */
function aktionKnopf(text,aktion,arg,kl){
  return '<button type="button"'+(kl?' class="'+kl+'"':"")+' data-aktion="'+aktion+'" data-arg="'+esc(arg||"")+'">'+esc(text)+"</button>";
}
function behebenKnopf(i){return aktionKnopf("Beheben","beheben",problemSchluessel(i),"primary");}
export function konfliktZeile(i){
  var txt,kl="ri",akt="",icn="alert";
  if(i.type==="black"){
    icn="split";
    txt=esc(sName(i.a))+" und "+esc(sName(i.b))+" sitzen zu nah beieinander<small>Auseinander setzen · "+esc(stufenText("bl",i.stufe||"moderat"))+"</small>";
    akt=behebenKnopf(i)+aktionKnopf("Regel ändern","rule",i.gid);
  }else if(i.type==="white"){
    kl+=" wl";icn="link";
    txt=esc(sName(i.a))+" sitzt nicht nah genug bei der eigenen Gruppe<small>Zusammen setzen · "+esc(stufenText("wl",i.stufe||"moderat"))+"</small>";
    akt=behebenKnopf(i)+aktionKnopf("Regel ändern","rule",i.gid);
  }else if(i.type==="tag"){
    kl+=" wl";icn="tag";
    var tn=(i.tags||[]).map(function(id){var t=tagById(id);return t?"„"+t.name+"“":"";}).filter(Boolean).join(", ");
    txt=esc(sName(i.a))+" hat keinen Platz"+(tn?" mit "+esc(tn):" mit dem gewünschten Merkmal")+" bekommen<small>Platzwunsch</small>";
    akt=behebenKnopf(i)+aktionKnopf("Plätze markieren","room","")+aktionKnopf("Person bearbeiten","person",i.a);
  }else if(i.type==="solo"){
    kl+=" wl";icn="user";
    txt=esc(sName(i.a))+" sitzt nicht allein<small>Der Nachbarplatz am Tisch ist besetzt</small>";
    akt=behebenKnopf(i)+
      (S.state.options.solo==="all"?aktionKnopf("Einstellung","opts",""):aktionKnopf("Person bearbeiten","person",i.a));
  }else if(i.type==="lehrer"){
    kl+=" wl";icn="desk";
    txt=esc(sName(i.a))+" sitzt nicht nah genug am Lehrertisch<small>Nah am Lehrertisch · "+esc(lehrerText(S.STU[i.a]))+"</small>";
    akt=behebenKnopf(i)+aktionKnopf("Person bearbeiten","person",i.a);
  }else if(i.type==="unplaced"){
    kl+=" up";
    txt=esc(sName(i.a))+" hat keinen Platz<small>Es gibt zu wenige nutzbare Plätze</small>";
    akt=aktionKnopf("Raum öffnen","room","");
  }else return "";
  return '<div class="'+kl+'"><span class="ri-txt">'+ic(icn)+"<span>"+txt+'</span></span><span class="ri-akt">'+akt+"</span></div>";
}
function hinweisZeile(x){
  var ziele={room:"Raum öffnen",class:"Klasse öffnen",person:"Person bearbeiten",opts:"Einstellung",rule:"Regel ansehen"};
  return '<div class="ri '+(x.stufe==="warn"?"up":"info")+'"><span class="ri-txt">'+ic(x.stufe==="warn"?"alert":"info")+"<span>"+esc(x.text)+
    '</span></span><span class="ri-akt">'+(ziele[x.ziel]?aktionKnopf(ziele[x.ziel],x.ziel,x.arg):"")+"</span></div>";
}
function aktionenVerdrahten(b){
  if(b.dataset.aktionen)return;
  b.dataset.aktionen="1";
  b.addEventListener("click",function(e){
    var btn=e.target.closest?e.target.closest("[data-aktion]"):null;
    if(!btn)return;
    aktionAusfuehren(btn.getAttribute("data-aktion"),btn.getAttribute("data-arg"));
  });
}
export function aktionAusfuehren(a,arg){
  el("ov").hidden=true;
  if(a==="zeigen")zeigeImPlan(arg.split(","));
  else if(a==="beheben")konfliktBeheben(arg);
  else if(a==="rule")nachKlasse(function(){gruppeOffen[arg]=1;drawGroups();leuchte('[data-gid="'+arg+'"]');},"regeln");
  else if(a==="person")zuPerson(arg);
  else if(a==="opts")nachKlasse(function(){leuchte("#optEinzel");},"einstellungen");
  else if(a==="class")nachKlasse(function(){},"schueler");
  else if(a==="room")showTab("room");
  else if(a==="neu"){showTab("plan");generate();}
}
export function zeigeImPlan(ids){
  if(S.tab!=="plan")showTab("plan");
  S.hervor={ids:ids,bis:Date.now()+3600};
  renderRoom();
  var n=document.querySelector("#room .seat.flash");
  if(n){n.scrollIntoView({block:"center",inline:"center",behavior:"smooth"});S.raumFokus=null;n.focus({preventScroll:true});}
  else toast("Diese Person sitzt gerade nicht im Plan.","w");
  setTimeout(function(){
    S.hervor=null;
    document.querySelectorAll("#room .flash").forEach(function(x){x.classList.remove("flash");});
  },3700);
}
export function nachKlasse(fn,unter){
  var los=function(){if(unter)S.klasseReiter=unter;showTab("class");fn();};
  if(S.state.security.hash&&!S.unlocked){requireUnlock(los);return;}
  los();
}
function leuchte(sel){
  setTimeout(function(){
    var n=document.querySelector(sel);if(!n)return;
    n.scrollIntoView({block:"center",behavior:"smooth"});
    n.classList.add("flash");
    setTimeout(function(){n.classList.remove("flash");},3600);
  },60);
}
export function zuPerson(id){
  S.stuOffen[id]=1;S.stuSuche="";S.stuFilterG="";S.stuFilterL="";
  nachKlasse(function(){leuchte('.stu[data-sid="'+id+'"]');},"schueler");
}
export function pruefDialog(){
  var vp=vorpruefung(),konf=offeneRegeln();
  var platziert=Object.keys(S.state.arrangement).length;
  var unpl=S.letzteBewertung?S.letzteBewertung.issues.filter(function(i){return i.type==="unplaced";}):[];
  openModal(function(b){
    var h="<h3>Prüfung</h3>"+
      '<p class="muted" style="margin:-4px 0 6px">'+vp.n+" Schüler:innen · "+vp.pl+" Plätze · "+platziert+" platziert</p>";
    h+="<h4>Vor dem Anordnen</h4>";
    h+=vp.H.length?'<div class="report">'+vp.H.map(hinweisZeile).join("")+"</div>"
      :'<div class="ri ok"><span class="ri-txt">'+ic("checkCircle")+"<span>Keine Auffälligkeiten – Klasse, Regeln und Raum passen zusammen.</span></span></div>";
    h+="<h4>Aktueller Sitzplan</h4>";
    if(!platziert)h+='<p class="muted">Noch niemand platziert.</p>';
    else{
      var zeilen=konf.map(konfliktZeile).join("")+unpl.map(konfliktZeile).join("");
      h+=zeilen?'<div class="report">'+zeilen+"</div>"
        :'<div class="ri ok"><span class="ri-txt">'+ic("checkCircle")+"<span>Alle Regeln sind erfüllt.</span></span></div>";
    }
    h+='<div class="modal-actions"><button type="button" class="btn primary" data-aktion="neu" data-arg="">'+ic("shuffle")+"Neu anordnen</button></div>";
    b.innerHTML=h;
    aktionenVerdrahten(b);
  });
}

/* ===================== Ergebnisbericht ===================== */
export function showReport(res,hinweis){
  openModal(function(b){
    var h="<h3>Nicht alle Regeln ließen sich erfüllen</h3>";
    if(hinweis)h+='<div class="ri up" style="margin-bottom:8px"><span class="ri-txt">'+ic("alert")+"<span>"+esc(hinweis)+"</span></span></div>";
    h+='<div class="report">'+hardIssues(res.issues).map(konfliktZeile).join("")+"</div>";
    h+='<p class="hint" style="margin-top:12px">Widersprüchliche Regeln lassen sich nicht immer gleichzeitig erfüllen. „Beheben“ setzt nur die Betroffenen um – der übrige Plan bleibt, wie er ist. „Regel ändern“ springt direkt zur Einstellung.</p>';
    h+='<div class="modal-actions"><button type="button" class="btn" id="repOk">Plan ansehen</button>'+
      '<button type="button" class="btn primary" data-aktion="neu" data-arg="">'+ic("shuffle")+"Neu versuchen</button></div>";
    b.innerHTML=h;
    el("repOk").onclick=closeModal;
    aktionenVerdrahten(b);
  });
}
