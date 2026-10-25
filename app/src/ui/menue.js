import { el } from "../core/basis.js";
import { statusOeffnen } from "./plan-status.js";

/* ===================== Menü „Weitere Funktionen“ ===================== */
function menuEintraege(){return Array.prototype.slice.call(el("menu").querySelectorAll('[role="menuitem"]'));}
function menuAuf(){
  var m=el("menu");if(!m.hidden)return;
  m.hidden=false;el("btnMenu").setAttribute("aria-expanded","true");
  setTimeout(function(){var e=menuEintraege()[0];if(e)e.focus();},10);
}
export function menuZu(fokus){
  var m=el("menu");if(m.hidden)return;
  m.hidden=true;el("btnMenu").setAttribute("aria-expanded","false");
  if(fokus)el("btnMenu").focus();
}
el("btnMenu").onclick=function(){if(el("menu").hidden)menuAuf();else menuZu(false);};
el("btnMenu").addEventListener("keydown",function(e){
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();menuAuf();}
});
el("menu").addEventListener("keydown",function(e){
  var l=menuEintraege(),i=l.indexOf(document.activeElement),j=null;
  if(e.key==="ArrowDown")j=(i+1)%l.length;
  else if(e.key==="ArrowUp")j=(i-1+l.length)%l.length;
  else if(e.key==="Home")j=0;
  else if(e.key==="End")j=l.length-1;
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();menuZu(true);return;}
  else if(e.key==="Tab"){menuZu(false);return;}
  if(j===null)return;
  e.preventDefault();l[j].focus();
});
el("menu").addEventListener("click",function(e){
  if(e.target.closest&&e.target.closest('[role="menuitem"]'))menuZu(false);
});
document.addEventListener("pointerdown",function(e){
  if(el("menu").hidden)return;
  if(e.target.closest&&(e.target.closest("#menu")||e.target.closest("#btnMenu")))return;
  menuZu(false);
},true);
/* Status-Schublade auf Tablets: Tippen daneben schließt sie */
document.addEventListener("pointerdown",function(e){
  var w=el("tabPlan");
  if(!w.classList.contains("sp-open"))return;
  if(e.target.closest&&(e.target.closest("#statusPanel")||e.target.closest("#btnStatus")||e.target.closest(".ov")))return;
  statusOeffnen(false);
},true);
