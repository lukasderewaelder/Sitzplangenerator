import { el, esc } from "../core/basis.js";
import { S } from "../store.js";
import { toast } from "./meldungen.js";
import { openModal } from "./modal.js";
import { renderSide } from "./plan-status.js";
import { ic } from "./symbole.js";

/* ===================== Passwortschutz ===================== */
export function sha(text){
  if(window.crypto&&window.crypto.subtle&&window.isSecureContext){
    return window.crypto.subtle.digest("SHA-256",new TextEncoder().encode("sitzplan::"+text))
      .then(function(buf){
        return Array.prototype.map.call(new Uint8Array(buf),function(b){return("0"+b.toString(16)).slice(-2);}).join("");
      }).catch(function(){return simpleHash(text);});
  }
  return Promise.resolve(simpleHash(text));
}
function simpleHash(text){
  var h=5381;for(var i=0;i<text.length;i++)h=((h*33)^text.charCodeAt(i))>>>0;
  return "s"+h.toString(16);
}
export function requireUnlock(then,titel,text){
  if(!S.state.security.hash||S.unlocked){then();return;}
  openModal(function(b){
    b.innerHTML='<h3>'+esc(titel||"Geschützter Bereich")+'</h3>'+
      '<p class="hint">'+esc(text||"Namen, Hinweise, Leistungsstärken und Regeln sind mit einem Passwort geschützt.")+'</p>'+
      '<div class="rowf"><input type="password" id="pwIn" placeholder="Passwort" aria-label="Passwort" style="flex:1 1 200px" autocomplete="current-password">'+
      '<button type="button" id="pwGo" class="btn primary">'+ic("unlock")+'Entsperren</button></div>'+
      '<p class="hint" style="margin-top:14px">Passwort vergessen? Dann helfen nur eine ältere Sicherung oder „Neuen leeren Plan beginnen“ im Menü.</p>';
    function go(){
      sha(el("pwIn").value).then(function(h){
        if(h===S.state.security.hash){S.unlocked=true;S.letzteAktivitaet=Date.now();el("ov").hidden=true;renderSide();then();}
        else toast("Passwort falsch.","d");
      });
    }
    el("pwGo").onclick=go;
    el("pwIn").addEventListener("keydown",function(e){if(e.key==="Enter")go();});
    setTimeout(function(){var f=el("pwIn");if(f)f.focus();},60);
  });
}
