import "./styles/schrift.css";
import "./styles/tokens.css";
import "./styles/grundlagen.css";
import "./styles/rahmen.css";
import "./styles/arbeitsbereich.css";
import "./styles/raum.css";
import "./styles/raum-editor.css";
import "./styles/seiten.css";
import "./styles/dialoge.css";
import "./styles/beamer.css";
import "./styles/responsiv.css";
import "./styles/ergaenzungen.css";
import "./styles/geraet.css";
import "./styles/druck.css";

import "./core/basis.js";
import "./ui/symbole.js";
import "./core/konstanten.js";
import "./core/vorlagen.js";
import "./core/zustand.js";
import "./core/schema.js";
import "./ui/meldungen.js";
import "./io/speicher.js";
import "./core/geometrie.js";
import "./core/regeln.js";
import "./core/solver.js";
import "./ui/plan-ansicht.js";
import "./ui/plan-dnd.js";
import "./ui/plan-status.js";
import "./ui/zoom.js";
import "./ui/modal.js";
import "./ui/passwort.js";
import "./ui/raum-editor.js";
import "./ui/raum-panels.js";
import "./ui/klasse-schueler.js";
import "./ui/personenfeld.js";
import "./ui/klasse-merkmale.js";
import "./ui/klasse-regeln.js";
import "./ui/klasse-einstellungen.js";
import "./ui/hilfe.js";
import "./core/vorpruefung.js";
import "./core/beheben.js";
import "./ui/pruefbericht.js";
import "./io/krypto.js";
import "./io/sicherung.js";
import "./io/listen-import.js";
import "./io/druck.js";
import "./ui/bereiche.js";
import "./ui/menue.js";
import "./ui/thema.js";
import "./ui/beamer.js";
import "./ui/sperre.js";

import { dauerhaftenSpeicherErbitten, ersteInstallationHinweisen, offlineEinrichten } from "./io/geraet.js";
import { el, esc } from "./core/basis.js";
import { BEAMER_KEY } from "./core/konstanten.js";
import { kurztext } from "./core/schema.js";
import { generate } from "./core/solver.js";
import { defaultState } from "./core/zustand.js";
import { druckDialog } from "./io/druck.js";
import { exportJson, importJson } from "./io/sicherung.js";
import { Store, loadLocal, rueckgaengig, schritt, sofortSichern, speicherInit, speichernJetzt, wiederholen } from "./io/speicher.js";
import { S } from "./store.js";
import { beamerBeenden, beamerStarten } from "./ui/beamer.js";
import { showTab } from "./ui/bereiche.js";
import { confirmBox, toast, uhrzeit } from "./ui/meldungen.js";
import { closeModal, openModal } from "./ui/modal.js";
import { renderRoom } from "./ui/plan-ansicht.js";
import { renderAll, renderSide, statusOeffnen } from "./ui/plan-status.js";
import { renderRoomTab } from "./ui/raum-editor.js";
import { ic, symboleEinsetzen } from "./ui/symbole.js";
import { THEMA_KEY, themaAnwenden } from "./ui/thema.js";
import { pinchAnbinden, zoomAnzeige, zoomSetzen, zoomStufe } from "./ui/zoom.js";

/* ===================== Neuer leerer Plan ===================== */
function neuerPlan(){
  confirmBox("Wirklich einen neuen, leeren Plan beginnen? Der bisherige Plan lässt sich danach mit „Rückgängig“ oder aus einer Sicherung zurückholen.",function(){
    schritt("Neuer Plan",{ersetzt:true});
    S.state=defaultState();S.unlocked=false;S.edSel=null;S.selected=null;S.multiSel=null;S.seatMenu={tid:null,idx:null};
    el("planName").value=S.state.planName;
    if(S.tab==="room")renderRoomTab();
    if(S.tab==="class"||S.tab==="help")showTab("plan");else renderAll();
    toast("Neuer Plan angelegt.");
  },null,{ja:"Neuen Plan beginnen",gefahr:true});
}

/* ===================== Verdrahtung ===================== */
el("btnGen").onclick=generate;
el("vTeacher").onclick=function(){S.view="teacher";S.selected=null;renderRoom();renderSide();};
el("vStudent").onclick=function(){S.view="student";S.selected=null;renderRoom();renderSide();};
el("btnUndo").onclick=rueckgaengig;
el("btnRedo").onclick=wiederholen;
el("saveStatus").onclick=function(){
  if(Store.status==="fehler"){
    openModal(function(b){
      b.innerHTML="<h3>Nicht gespeichert</h3>"+
        "<p>"+esc(Store.fehlerText)+"</p>"+
        '<p class="hint">Deine Änderungen sind nur in diesem Fenster vorhanden und gehen beim Schließen verloren. Lade jetzt eine Sicherung herunter, damit nichts verloren geht.</p>'+
        '<div class="modal-actions"><button type="button" id="ssNochmal" class="btn">Erneut versuchen</button>'+
        '<button type="button" id="ssSich" class="btn primary">'+ic("download")+"Sicherung herunterladen</button></div>";
      el("ssNochmal").onclick=function(){
        speichernJetzt();closeModal();
        if(Store.status==="fehler")toast("Speichern ist weiterhin nicht möglich.","d");else toast("Gespeichert.");
      };
      el("ssSich").onclick=exportJson;
    });
  }else if(Store.status==="ungespeichert"){
    sofortSichern();toast(Store.status==="gespeichert"?"Gespeichert.":"Speichern ist nicht möglich.",Store.status==="gespeichert"?"":"d");
  }else{
    toast((Store.zuletzt?"Automatisch gespeichert um "+uhrzeit(Store.zuletzt)+" Uhr":"Alles gespeichert")+
      " – in diesem Browser. Für ein anderes Gerät: Menü → Sicherung herunterladen.");
  }
};
el("btnHelp").onclick=function(){showTab(S.tab==="help"?(S.hilfeVon||"plan"):"help");};
el("mHelp").onclick=function(){showTab("help");};
el("btnJson").onclick=exportJson;
el("btnOpen").onclick=function(){el("fileIn").click();};
el("btnPrint").onclick=druckDialog;
el("mPrint").onclick=druckDialog;
el("btnBeamer").onclick=function(){if(S.beamer)beamerBeenden();else beamerStarten(false);};
el("mBeamer").onclick=function(){if(S.beamer)beamerBeenden();else beamerStarten(false);};
el("btnBeamerExit").onclick=beamerBeenden;
el("btnNew").onclick=neuerPlan;
el("btnTheme").onclick=function(){
  S.thema={auto:"light",light:"dark",dark:"auto"}[S.thema]||"auto";
  try{localStorage.setItem(THEMA_KEY,S.thema);}catch(e){}
  themaAnwenden();
  toast(el("btnThemeTxt").textContent+".");
};
el("fileIn").onchange=function(e){
  if(e.target.files&&e.target.files[0])importJson(e.target.files[0]);
  e.target.value="";
};
el("btnLock").onclick=function(){
  if(!S.state.security.hash){toast("Es ist kein Passwort gesetzt (Klasse → Einstellungen → Passwortschutz).","w");return;}
  S.unlocked=false;
  if(S.tab==="class")showTab("plan");else renderSide();
  toast("Der Bereich „Klasse“ ist jetzt gesperrt.");
};
el("planName").onchange=function(){
  if(S.beamer){this.value=S.state.planName;return;}
  var n=kurztext(this.value,80)||"Sitzplan";
  if(n!==S.state.planName){schritt("Plan umbenannt");S.state.planName=n;}
  this.value=n;
};
el("planName").addEventListener("keydown",function(e){if(e.key==="Enter")this.blur();});
el("btnStatus").onclick=function(){statusOeffnen(!el("tabPlan").classList.contains("sp-open"));};
el("spClose").onclick=function(){statusOeffnen(false);el("btnStatus").focus();};
el("zOut").onclick=function(){zoomStufe("plan",-1);};
el("zIn").onclick=function(){zoomStufe("plan",1);};
el("zFit").onclick=function(){zoomSetzen("plan",1);};
pinchAnbinden(el("stage"),"plan");

/* ===================== Start ===================== */
symboleEinsetzen();
themaAnwenden();
var hatPlan=loadLocal();
el("planName").value=S.state.planName;
zoomAnzeige();
renderAll();
speicherInit();
offlineEinrichten();
dauerhaftenSpeicherErbitten();
ersteInstallationHinweisen(hatPlan||S.ladeFehler);
if(S.ladeFehler)toast("Der zuletzt gespeicherte Stand war beschädigt und konnte nicht geladen werden. Er bleibt im Browser aufbewahrt; es beginnt ein leerer Plan.","d");
(function(){
  var bw=null;try{bw=localStorage.getItem(BEAMER_KEY);}catch(e){}
  if(bw)beamerStarten(true,bw);
})();
