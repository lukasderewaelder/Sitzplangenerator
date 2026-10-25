import { el } from "../core/basis.js";
import { closeModal, openModal } from "../ui/modal.js";

/* ===================== Installierte App: Offline, Speicher, Hinweise ===================== */
var HINWEIS_KEY="sitzplan_installhinweis";

/* läuft die Seite als installierte App (Home-Bildschirm / Desktop-App) und nicht im Browser-Tab? */
export function alsAppGestartet(){
  try{
    if(window.navigator.standalone===true)return true;
    return !!(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches);
  }catch(e){return false;}
}

/* Service Worker: macht den Start ohne Netz möglich (nicht beim lokalen Öffnen als Datei) */
export function offlineEinrichten(){
  if(!("serviceWorker" in navigator)||!/^https?:$/.test(location.protocol))return;
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("./sw.js").catch(function(e){
      if(window.console)console.warn("Offline-Betrieb nicht verfügbar:",e);
    });
  });
}

/* Den Browser bitten, den Speicher nicht von selbst zu räumen (wirkt vor allem am PC) */
export function dauerhaftenSpeicherErbitten(){
  try{
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
  }catch(e){}
}

/* Einmaliger Hinweis beim ersten Start der installierten App ohne Plan: dort ist der Speicher neu und leer,
   getrennt von dem im Browser-Tab (auf dem iPad gilt das für Safari). */
export function ersteInstallationHinweisen(hatPlan){
  if(hatPlan||!alsAppGestartet())return;
  try{if(localStorage.getItem(HINWEIS_KEY))return;}catch(e){return;}
  openModal(function(b){
    b.innerHTML="<h3>Willkommen in der App</h3>"+
      "<p>Die installierte App hat einen <strong>eigenen Speicher</strong> – getrennt von dem im Browser. "+
      "Pläne, die du früher im Browser angelegt hast, sind hier zunächst nicht zu sehen.</p>"+
      '<p class="hint">So holst du sie her: Öffne die Seite im Browser, wähle dort Menü → „Sicherung herunterladen“. '+
      "Hier in der App dann Menü → „Sicherung öffnen“ und die Datei auswählen (auf dem iPad liegt sie in „Dateien“).</p>"+
      '<div class="modal-actions"><button id="ihOk" type="button" class="btn primary">Verstanden</button></div>';
    el("ihOk").onclick=function(){
      try{localStorage.setItem(HINWEIS_KEY,"1");}catch(e){}
      closeModal();
    };
  });
}
