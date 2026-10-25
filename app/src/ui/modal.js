import { el } from "../core/basis.js";
import { S } from "../store.js";
import { menuZu } from "./menue.js";
import { renderAll, statusOeffnen } from "./plan-status.js";
import { drawEditor, sitzpunktFokus } from "./raum-editor.js";

/* ===================== Modale Fenster ===================== */
S.modalRueck=null;
S.confirmRueck=null;
var FOKUSSIERBAR='button:not([disabled]),[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function sichtbareFokusziele(box){
  return Array.prototype.filter.call(box.querySelectorAll(FOKUSSIERBAR),function(n){
    return !n.hidden&&n.offsetParent!==null&&!n.closest("[hidden]");
  });
}
function erstenFokus(box,ohne){
  setTimeout(function(){
    var ziele=sichtbareFokusziele(box).filter(function(n){return n!==ohne;});
    var feld=ziele.filter(function(n){return /^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName)&&n.type!=="radio"&&n.type!=="checkbox";})[0];
    var ziel=feld||ziele.filter(function(n){return n.classList.contains("primary");})[0]||ziele[0]||ohne;
    if(ziel)ziel.focus();
  },30);
}
export function merkeRueckfokus(){
  var a=document.activeElement;
  if(!a||a===document.body)return null;
  return{node:a,k:a.dataset?a.dataset.k:null,id:a.id||null};
}
export function stelleFokusHer(r){
  if(!r)return;
  var n=null;
  if(r.k)n=document.querySelector('#room .seat[data-k="'+r.k+'"]');
  if(!n&&r.node&&document.contains(r.node))n=r.node;
  if(!n&&r.id)n=el(r.id);
  if(n&&n.offsetParent!==null)try{n.focus({preventScroll:true});}catch(e){n.focus();}
}
export function openModal(build,wide){
  if(el("ov").hidden)S.modalRueck=merkeRueckfokus();
  var box=el("modalBox");
  box.className="modal"+(wide?" wide":"");
  el("modalBody").innerHTML="";build(el("modalBody"));el("ov").hidden=false;
  var t=el("modalBody").querySelector("h2,h3");
  if(t){t.id="modalTitel";box.setAttribute("aria-labelledby","modalTitel");}else box.removeAttribute("aria-labelledby");
  erstenFokus(box,el("modalX"));
}
export function closeModal(){
  el("ov").hidden=true;renderAll();
  var r=S.modalRueck;S.modalRueck=null;stelleFokusHer(r);
}
el("modalX").onclick=closeModal;
el("ov").addEventListener("click",function(e){if(e.target.id==="ov")closeModal();});
function fokusFalle(e,box){
  var ziele=sichtbareFokusziele(box);if(!ziele.length)return;
  var erst=ziele[0],letzt=ziele[ziele.length-1];
  if(!box.contains(document.activeElement)){e.preventDefault();erst.focus();return;}
  if(e.shiftKey&&document.activeElement===erst){e.preventDefault();letzt.focus();}
  else if(!e.shiftKey&&document.activeElement===letzt){e.preventDefault();erst.focus();}
}
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){
    if(!el("cov").hidden){el("cNo").click();e.preventDefault();}
    else if(!el("ov").hidden){closeModal();e.preventDefault();}
    else if(!el("menu").hidden){menuZu(true);e.preventDefault();}
    else if(S.tab==="room"&&S.seatMenu.tid!==null){var d=S.seatMenu;S.seatMenu={tid:null,idx:null};drawEditor();sitzpunktFokus(d);e.preventDefault();}
    else if(el("tabPlan").classList.contains("sp-open")){statusOeffnen(false);el("btnStatus").focus();e.preventDefault();}
  }else if(e.key==="Tab"){
    if(!el("cov").hidden)fokusFalle(e,el("cBox"));
    else if(!el("ov").hidden)fokusFalle(e,el("modalBox"));
  }
});
