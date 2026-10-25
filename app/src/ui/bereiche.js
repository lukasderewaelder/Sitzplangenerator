import { el } from "../core/basis.js";
import { S } from "../store.js";
import { renderHelpTab } from "./hilfe.js";
import { renderClassTab } from "./klasse-schueler.js";
import { menuZu } from "./menue.js";
import { requireUnlock } from "./passwort.js";
import { renderAll, statusOeffnen } from "./plan-status.js";
import { renderRoomTab } from "./raum-editor.js";

/* ===================== Bereiche ===================== */
S.tab="plan";
export function showTab(name){
  if(S.beamer&&name!=="plan")return;
  if(name==="class"&&S.state.security.hash&&!S.unlocked){
    requireUnlock(function(){showTab("class");},"Bereich „Klasse“ entsperren");
    return;
  }
  if(name==="help"&&S.tab!=="help")S.hilfeVon=S.tab;
  S.tab=name;
  menuZu(false);
  statusOeffnen(false);
  el("tabPlan").hidden=(name!=="plan");
  el("tabRoom").hidden=(name!=="room");
  el("tabClass").hidden=(name!=="class");
  el("tabHelp").hidden=(name!=="help");
  var irgendein=false;
  document.querySelectorAll(".tab").forEach(function(b){
    var an=(b.dataset.tab===name);
    if(an)irgendein=true;
    b.classList.toggle("on",an);
    b.setAttribute("aria-selected",an?"true":"false");
    b.tabIndex=an?0:-1;
  });
  if(!irgendein)el("tabBtnPlan").tabIndex=0;
  el("btnHelp").setAttribute("aria-pressed",name==="help"?"true":"false");
  if(name==="room")renderRoomTab();
  else if(name==="class")renderClassTab();
  else if(name==="help"){renderHelpTab();el("tabHelp").scrollTop=0;}
  else renderAll();
}
document.querySelectorAll(".tab").forEach(function(btn){
  btn.onclick=function(){showTab(btn.dataset.tab);};
});
/* Pfeiltasten wandern zwischen den Bereichen, Eingabe/Leertaste öffnet */
document.querySelector(".tabs").addEventListener("keydown",function(e){
  var reiter=Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var i=reiter.indexOf(document.activeElement);if(i<0)return;
  var j=null;
  if(e.key==="ArrowRight")j=(i+1)%reiter.length;
  else if(e.key==="ArrowLeft")j=(i-1+reiter.length)%reiter.length;
  else if(e.key==="Home")j=0;
  else if(e.key==="End")j=reiter.length-1;
  if(j===null)return;
  e.preventDefault();reiter[j].focus();
});
