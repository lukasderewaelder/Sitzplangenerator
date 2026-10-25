import { el } from "../core/basis.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { toast } from "./meldungen.js";
import { renderSide } from "./plan-status.js";

/* ===================== Automatische Sperre ===================== */
["pointerdown","keydown","wheel","touchstart"].forEach(function(t){
  document.addEventListener(t,function(){S.letzteAktivitaet=Date.now();},{capture:true,passive:true});
});
function sperren(grund){
  if(!S.state.security.hash||!S.unlocked)return;
  S.unlocked=false;
  if(S.tab==="class"){
    if(!el("cov").hidden){el("cov").hidden=true;S.pendingYes=null;S.pendingNo=null;}
    el("ov").hidden=true;
    showTab("plan");
  }else renderSide();
  toast("Der Bereich „Klasse“ wurde "+grund+" gesperrt.");
}
setInterval(function(){
  var al=S.state.security.autolock;
  if(!S.state.security.hash||!S.unlocked||!al||!al.min)return;
  if(Date.now()-S.letzteAktivitaet>=al.min*60000)sperren("nach "+al.min+" Minuten ohne Eingabe");
},15000);
document.addEventListener("visibilitychange",function(){
  var al=S.state.security.autolock;
  if(document.hidden&&al&&al.bg)sperren("beim Wechsel in den Hintergrund");
});
