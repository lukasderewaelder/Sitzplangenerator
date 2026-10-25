import { el } from "../core/basis.js";
import { NAMENSFORMATE, reindex } from "../core/zustand.js";
import { save, schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { renderClassTab } from "./klasse-schueler.js";
import { toast } from "./meldungen.js";
import { sha } from "./passwort.js";
import { renderSide } from "./plan-status.js";
import { ic } from "./symbole.js";

/* ===================== Einstellungen ===================== */
export function buildOpts(b){
  function radio(name,wert,titel,text,aktuell){
    return '<label><input type="radio" name="'+name+'" value="'+wert+'"'+(aktuell===wert?" checked":"")+"><span>"+titel+(text?"<small>"+text+"</small>":"")+"</span></label>";
  }
  var sec=S.state.security,hat=!!sec.hash;
  b.innerHTML='<div class="optgrid">'+
    '<div class="card"><div class="card-h">'+ic("sliders")+"<h2>Mischen</h2>"+
      "<p>Weiche Regeln: Sie werden so gut wie möglich erfüllt. „Auseinander setzen“, „Zusammen setzen“ und Platzwünsche haben immer Vorrang.</p></div>"+
      '<div class="insp-h">Geschlecht (Tanya-Parameter)</div><div class="radiocards">'+
        radio("g","off","aus","",S.state.options.gender)+
        radio("g","mix","gemischt","Nachbarplätze möglichst unterschiedlich",S.state.options.gender)+
        radio("g","split","getrennt","Nachbarplätze möglichst gleich",S.state.options.gender)+"</div>"+
      '<div class="insp-h" style="margin-top:16px">Leistung</div><div class="radiocards">'+
        radio("l","off","aus","",S.state.options.level)+
        radio("l","hetero","gemischt (heterogen)","stark neben schwächer – etwa als Helfersystem",S.state.options.level)+
        radio("l","homo","ähnlich (homogen)","ähnliches Niveau zusammen – etwa für Niveaugruppen",S.state.options.level)+"</div>"+
    "</div>"+
    '<div>'+
      '<div class="card" id="optEinzel"><div class="card-h">'+ic("user")+"<h2>Einzelsitzen</h2></div>"+
        '<div class="radiocards">'+
          radio("so","off","nur markierte Personen","wer in der Klassenliste „sitzt allein“ hat",S.state.options.solo)+
          radio("so","all","alle einzeln","soweit die Plätze reichen – etwa für Klassenarbeiten",S.state.options.solo)+"</div>"+
        '<p class="hint" style="margin-bottom:0">„Allein“ heißt: Der Nachbarplatz am selben Tisch bleibt frei. Reichen die Plätze nicht, nennt die Prüfung die höchstmögliche Zahl. Im Modus „alle einzeln“ gilt „Zusammen setzen“ nicht.</p>'+
      "</div>"+
      '<div class="card" style="margin-top:16px"><div class="card-h">'+ic("eye")+"<h2>Im Plan und im Ausdruck anzeigen</h2>"+
        "<p>Nur in der Lehrersicht und auf dem Lehrerblatt – nie auf dem Blatt für die Klasse. Platzmerkmale werden nie gedruckt.</p></div>"+
        '<label class="check"><input type="checkbox" id="optNotes"'+(S.state.options.showNotes?" checked":"")+"><span>Hinweise</span></label>"+
        '<label class="check"><input type="checkbox" id="optGender"'+(S.state.options.showGender?" checked":"")+"><span>Geschlecht</span></label>"+
        '<label class="check"><input type="checkbox" id="optLevel"'+(S.state.options.showLevel?" checked":"")+"><span>Leistungsstärke</span></label>"+
        '<label class="field" style="margin-top:10px">Namen im Plan und im Ausdruck<select id="optNamen">'+
          Object.keys(NAMENSFORMATE).map(function(k){return '<option value="'+k+'"'+(S.state.options.nameFormat===k?" selected":"")+">"+NAMENSFORMATE[k]+"</option>";}).join("")+
        "</select></label>"+
      "</div>"+
    "</div>"+
    '<div class="card"><div class="card-h">'+ic("lock")+"<h2>Passwortschutz</h2><span class=\"spacer\"></span>"+
      '<span class="badge '+(hat?"ok":"")+'">'+(hat?ic("check")+"aktiv":"nicht gesetzt")+"</span>"+
      "<p>Sperrt diesen Bereich mit Namen, Hinweisen, Leistungsstärken und Regeln. Das ist ein Sichtschutz auf diesem Gerät. Eine Sicherung ist nur geschützt, wenn du sie beim Herunterladen verschlüsselst.</p></div>"+
      '<div class="rowf"><input type="password" id="pwNew" aria-label="'+(hat?"Neues Passwort":"Passwort festlegen")+'" placeholder="'+(hat?"Neues Passwort":"Passwort festlegen")+'" style="flex:1 1 200px" autocomplete="new-password">'+
      '<button type="button" id="pwSet" class="btn primary">'+(hat?"Ändern":"Festlegen")+"</button>"+
      (hat?'<button type="button" id="pwClear" class="btn danger">Schutz entfernen</button>':"")+"</div>"+
      (hat?
        '<div class="insp-h" style="margin-top:18px">Automatisch sperren</div>'+
        '<div class="rowf"><label for="alMin" style="font-size:14.5px">nach</label>'+
        '<select id="alMin">'+[[0,"nie"],[5,"5 Minuten"],[10,"10 Minuten"],[15,"15 Minuten"],[30,"30 Minuten"]].map(function(o){
          return '<option value="'+o[0]+'"'+(sec.autolock.min===o[0]?" selected":"")+">"+o[1]+"</option>";}).join("")+
        '</select><span style="font-size:14.5px">ohne Eingabe</span></div>'+
        '<label class="check"><input type="checkbox" id="alBg"'+(sec.autolock.bg?" checked":"")+
        "><span>sofort sperren, wenn die App in den Hintergrund wechselt oder das Gerät gesperrt wird</span></label>":
        '<p class="hint" style="margin-bottom:0">Mit Passwort lässt sich außerdem eine automatische Sperre einstellen.</p>')+
    "</div>"+
  "</div>";
  b.querySelectorAll("input[name=g]").forEach(function(r){r.onchange=function(){schritt("Mischregel geändert");S.state.options.gender=r.value;};});
  b.querySelectorAll("input[name=l]").forEach(function(r){r.onchange=function(){schritt("Mischregel geändert");S.state.options.level=r.value;};});
  b.querySelectorAll("input[name=so]").forEach(function(r){r.onchange=function(){schritt("Einzelsitzen geändert");S.state.options.solo=r.value;};});
  el("optNotes").onchange=function(){schritt("Anzeige geändert");S.state.options.showNotes=this.checked;};
  el("optGender").onchange=function(){schritt("Anzeige geändert");S.state.options.showGender=this.checked;};
  el("optLevel").onchange=function(){schritt("Anzeige geändert");S.state.options.showLevel=this.checked;};
  el("optNamen").onchange=function(){schritt("Namensformat geändert");S.state.options.nameFormat=this.value;reindex();};
  el("pwSet").onclick=function(){
    var v=el("pwNew").value;
    if(v.length<3){toast("Bitte mindestens 3 Zeichen.","w");el("pwNew").focus();return;}
    sha(v).then(function(h){
      S.state.security.hash=h;S.unlocked=true;S.letzteAktivitaet=Date.now();save();
      toast("Passwort gespeichert. Der Bereich „Klasse“ ist jetzt geschützt.");renderClassTab();renderSide();
    });
  };
  el("pwNew").addEventListener("keydown",function(e){if(e.key==="Enter")el("pwSet").click();});
  if(el("pwClear"))el("pwClear").onclick=function(){
    S.confirmBox("Passwortschutz wirklich entfernen?",function(){
      S.state.security.hash=null;save();renderClassTab();renderSide();
    },null,{ja:"Schutz entfernen",gefahr:true});
  };
  if(el("alMin")){
    el("alMin").onchange=function(){S.state.security.autolock.min=parseInt(this.value,10)||0;save();};
    el("alBg").onchange=function(){S.state.security.autolock.bg=this.checked;save();};
  }
}
