import { el } from "../core/basis.js";
import { S } from "../store.js";
import { merkeRueckfokus, stelleFokusHer } from "./modal.js";
import { ic } from "./symbole.js";

/* ===================== Meldungen ===================== */
export function toast(msg,kind){
  var d=document.createElement("div");d.className="toast"+(kind?" "+kind:"");
  d.innerHTML=ic(kind?"alert":"check")+"<span></span>";d.lastChild.textContent=msg;
  el("toasts").appendChild(d);setTimeout(function(){d.remove();},4200);
}
S.pendingYes=null;
S.pendingNo=null;
/* Ja/Nein-Rückfrage; der Fokus kehrt danach an die vorige Stelle zurück */
export function confirmBox(msg,fn,onNo,opt){
  S.confirmRueck=merkeRueckfokus();
  el("cText").textContent=msg;
  S.pendingYes=function(){var r=S.confirmRueck;S.confirmRueck=null;if(fn)fn();if(el("ov").hidden)stelleFokusHer(r);};
  S.pendingNo=function(){var r=S.confirmRueck;S.confirmRueck=null;if(onNo)onNo();stelleFokusHer(r);};
  var y=el("cYes");y.textContent=(opt&&opt.ja)||"Ja";y.className="btn "+((opt&&opt.gefahr)?"dangerfill":"primary");
  el("cov").hidden=false;
  setTimeout(function(){el("cYes").focus();},30);
}
el("cYes").onclick=function(){
  el("cov").hidden=true;var f=S.pendingYes;S.pendingYes=null;S.pendingNo=null;if(f)f();
};
el("cNo").onclick=function(){
  el("cov").hidden=true;var f=S.pendingNo;S.pendingYes=null;S.pendingNo=null;if(f)f();
};
export function ansage(text){
  var a=el("ansage");if(!a)return;
  a.textContent="";setTimeout(function(){a.textContent=text;},30);
}
export function uhrzeit(d){return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
