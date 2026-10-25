import { el } from "../core/basis.js";
import { S } from "../store.js";
import { ic } from "./symbole.js";

/* ===================== Meldungen ===================== */
export function toast(msg,kind){
  var d=document.createElement("div");d.className="toast"+(kind?" "+kind:"");
  d.innerHTML=ic(kind?"alert":"check")+"<span></span>";d.lastChild.textContent=msg;
  el("toasts").appendChild(d);setTimeout(function(){d.remove();},4200);
}
S.pendingYes=null;
S.pendingNo=null;
function confirmBox(msg,fn,onNo,opt){
  el("cText").textContent=msg;S.pendingYes=fn;S.pendingNo=onNo||null;
  var y=el("cYes");y.textContent=(opt&&opt.ja)||"Ja";y.className="btn "+((opt&&opt.gefahr)?"dangerfill":"primary");
  el("cov").hidden=false;
}
S.confirmBox = confirmBox;
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
