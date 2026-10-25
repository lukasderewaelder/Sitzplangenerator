import { el, esc } from "../core/basis.js";
import { SCHEMA } from "../core/konstanten.js";
import { auspacken, pruefeUndMigriere } from "../core/schema.js";
import { entschluesseln, kryptoMoeglich, verschluesseln } from "./krypto.js";
import { textDekodieren } from "./listen-import.js";
import { schritt, sofortSichern } from "./speicher.js";
import { S } from "../store.js";
import { showTab } from "../ui/bereiche.js";
import { toast } from "../ui/meldungen.js";
import { closeModal, openModal } from "../ui/modal.js";
import { ic } from "../ui/symbole.js";

/* ===================== Download-Fähigkeit ===================== */
S.dl=null;
if(window.claude&&window.claude.use){
  window.claude.use("downloads").then(function(c){S.dl=c;}).catch(function(){S.dl=null;});
}

/* ===================== Sicherung (intern weiterhin JSON) ===================== */
function fileBase(){
  return (S.state.planName||"Sitzplan").replace(/[^a-zA-Z0-9äöüÄÖÜß _-]+/g,"").trim().replace(/\s+/g,"_")||"Sitzplan";
}
function heute(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
function dateiAnbieten(name,data,erfolg){
  if(S.dl){
    S.dl.save({filename:name,data:data}).then(function(r){
      if(r&&r.status==="saved")toast(erfolg+": "+name);
    }).catch(function(e){
      if(e&&e.code==="declined")return;
      toast("Sicherung fehlgeschlagen: "+((e&&e.message)||"unbekannter Fehler"),"d");
    });
    return;
  }
  try{
    var blob=new Blob([data],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);a.remove();},800);
    toast(erfolg+": "+name);
  }catch(e){
    toast("Herunterladen ist hier nicht möglich.","d");
  }
}
function sicherungsInhalt(){
  var o=JSON.parse(JSON.stringify(S.state));
  o.v=SCHEMA;o.format="sitzplan-sicherung";o.gespeichertAm=new Date().toISOString();
  return JSON.stringify(o,null,2);
}
/* „Sicherung herunterladen“ – auf Wunsch mit echtem Passwortschutz der Datei */
export function exportJson(){
  sofortSichern();
  var krypto=kryptoMoeglich();
  openModal(function(b){
    b.innerHTML='<h3>Sicherung herunterladen</h3>'+
      '<p class="hint">Die Sicherung enthält den kompletten Plan: Raum, Klassenliste mit Hinweisen, Regeln, Optionen, Vorlagen und die aktuelle Sitzordnung. Mit „Sicherung öffnen“ holst du sie später zurück – auch auf einem anderen Gerät.</p>'+
      (krypto?
        '<label class="check" style="margin-top:6px"><input type="checkbox" id="sgKrypt"'+(S.state.security.hash?" checked":"")+
        '><span>Sicherung mit Passwort verschlüsseln</span></label>'+
        '<div id="sgPw" class="rowf" style="margin:0 0 6px 22px">'+
          '<input type="password" id="sgPw1" placeholder="Passwort" aria-label="Passwort für die Sicherung" style="flex:1;min-width:140px">'+
          '<input type="password" id="sgPw2" placeholder="Passwort wiederholen" aria-label="Passwort wiederholen" style="flex:1;min-width:140px"></div>'+
        '<p class="hint" id="sgInfo" style="margin-left:22px"></p>'
        :'<p class="hint">Verschlüsseln ist in diesem Browser nicht möglich (nur über eine sichere Verbindung). Die Sicherung wird unverschlüsselt gespeichert.</p>')+
      '<div class="modal-actions"><button id="sgAbbr" type="button" class="btn">Abbrechen</button>'+
      '<button id="sgGo" class="btn primary" type="button">'+ic("download")+'<span>Herunterladen</span></button></div>';
    function info(){
      if(!krypto)return;
      var an=el("sgKrypt").checked;
      el("sgPw").hidden=!an;
      el("sgInfo").textContent=an?"Ohne dieses Passwort lässt sich die Datei nicht mehr öffnen – es kann nicht wiederhergestellt werden. Es darf dasselbe sein wie der Passwortschutz der Klasse.":
        "Ohne Verschlüsselung stehen alle Angaben, auch Hinweise und Leistungsstärken, lesbar in der Datei.";
    }
    if(krypto){el("sgKrypt").onchange=info;info();}
    el("sgAbbr").onclick=closeModal;
    el("sgGo").onclick=function(){
      var inhalt=sicherungsInhalt(),basis="Sitzplan_"+fileBase()+"_"+heute();
      if(krypto&&el("sgKrypt").checked){
        var p1=el("sgPw1").value,p2=el("sgPw2").value;
        if(p1.length<4){toast("Bitte ein Passwort mit mindestens 4 Zeichen wählen.","w");el("sgPw1").focus();return;}
        if(p1!==p2){toast("Die beiden Passwörter stimmen nicht überein.","w");el("sgPw2").focus();return;}
        el("sgGo").disabled=true;el("sgGo").lastChild.textContent="Verschlüssle …";
        verschluesseln(inhalt,p1).then(function(data){
          closeModal();dateiAnbieten(basis+"_verschluesselt.json",data,"Verschlüsselte Sicherung gespeichert");
        }).catch(function(){
          el("sgGo").disabled=false;el("sgGo").lastChild.textContent="Herunterladen";
          toast("Verschlüsseln ist fehlgeschlagen.","d");
        });
        return;
      }
      closeModal();dateiAnbieten(basis+".json",inhalt,"Sicherung gespeichert");
    };
  });
}
/* Text einer Sicherung: UTF-8 (mit oder ohne BOM), UTF-16 (etwa nach „Speichern unter“ im Editor) oder Windows-1252 */
function sicherungsText(buf){
  var b=new Uint8Array(buf);
  try{
    if(b.length>=2&&b[0]===0xFF&&b[1]===0xFE)return new TextDecoder("utf-16le").decode(b.subarray(2));
    if(b.length>=2&&b[0]===0xFE&&b[1]===0xFF)return new TextDecoder("utf-16be").decode(b.subarray(2));
    if(b.length>=4&&b[0]!==0&&b[1]===0&&b[3]===0)return new TextDecoder("utf-16le").decode(b);
    if(b.length>=4&&b[0]===0&&b[1]!==0&&b[2]===0)return new TextDecoder("utf-16be").decode(b);
  }catch(e){}
  return textDekodieren(b);
}
/* JSON lesen – notfalls nur den Teil zwischen erster „{“ und letzter „}“ (z. B. Text davor oder danach) */
function jsonLesen(text){
  text=String(text).replace(/^\ufeff/,"").trim();
  try{return JSON.parse(text);}catch(e){}
  var a=text.indexOf("{"),z=text.lastIndexOf("}");
  if(a!==-1&&z>a){try{return JSON.parse(text.slice(a,z+1));}catch(e2){}}
  return undefined;
}
/* „Sicherung öffnen“: prüfen, ggf. entschlüsseln, migrieren, übernehmen */
export function importJson(file){
  if(file.size>10*1024*1024){toast("Die Datei ist zu groß für eine Sitzplan-Sicherung.","d");return;}
  var fr=new FileReader();
  fr.onload=function(e){
    var roh=jsonLesen(sicherungsText(e.target.result));
    if(roh===undefined){
      toast(/\.(csv|tsv|xlsx?|ods)$/i.test(file.name||"")?
        "Das ist eine Tabelle, keine Sicherung. Klassenlisten bitte unter „Klasse“ → „Aus Datei“ laden.":
        "Die Datei „"+(file.name||"")+"“ ist keine lesbare Sitzplan-Sicherung (kein JSON-Inhalt).","d");
      return;
    }
    if(roh&&typeof roh==="object"&&!Array.isArray(roh)&&!roh.verschluesselt){var inn=auspacken(roh);if(inn&&inn.verschluesselt===true)roh=inn;}
    if(roh&&roh.verschluesselt===true){
      if(!kryptoMoeglich()){toast("Verschlüsselte Sicherungen lassen sich nur über eine sichere Verbindung öffnen.","d");return;}
      if(!roh.kdf||typeof roh.kdf.salt!=="string"||typeof roh.iv!=="string"||typeof roh.daten!=="string"){
        toast("Die verschlüsselte Sicherung ist unvollständig.","d");return;
      }
      openModal(function(b){
        b.innerHTML='<h3>Verschlüsselte Sicherung öffnen</h3>'+
          '<p class="hint">Diese Sicherung ist mit einem Passwort geschützt.</p>'+
          '<div class="rowf"><input type="password" id="soPw" placeholder="Passwort" aria-label="Passwort der Sicherung" style="flex:1">'+
          '<button id="soGo" class="btn primary" type="button">Öffnen</button></div>';
        function los(){
          el("soGo").disabled=true;el("soGo").textContent="Entschlüssle …";
          entschluesseln(roh,el("soPw").value).then(function(text){
            el("ov").hidden=true;
            var inner;try{inner=JSON.parse(text);}catch(err){toast("Die Sicherung ist beschädigt.","d");return;}
            sicherungUebernehmen(inner);
          }).catch(function(){
            el("soGo").disabled=false;el("soGo").textContent="Öffnen";
            toast("Passwort falsch oder Datei beschädigt.","d");el("soPw").select();
          });
        }
        el("soGo").onclick=los;
        el("soPw").addEventListener("keydown",function(ev){if(ev.key==="Enter")los();});
      });
      return;
    }
    sicherungUebernehmen(roh);
  };
  fr.onerror=function(){toast("Die Datei konnte nicht gelesen werden.","d");};
  fr.readAsArrayBuffer(file);
}
function sicherungUebernehmen(roh){
  var r;
  try{r=pruefeUndMigriere(roh);}
  catch(err){
    if(!err||!err.datenFehler){try{console.error("Sicherung öffnen:",err);}catch(e2){}}
    toast("Öffnen nicht möglich: "+(err&&err.datenFehler?err.message:
      "Die Datei ließ sich nicht einlesen (technischer Grund: "+((err&&err.message)||"unbekannt")+")."),"d");
    return;
  }
  sofortSichern();
  schritt("Sicherung geöffnet",{ersetzt:true});
  S.state=r.state;S.unlocked=false;S.selected=null;S.edSel=null;
  el("planName").value=S.state.planName||"Sitzplan";
  showTab("plan");
  toast("Sicherung geöffnet: "+(S.state.planName||"Sitzplan")+" – mit ↶ rückgängig zu machen.");
  if(r.hinweise.length){
    openModal(function(b){
      b.innerHTML="<h3>Sicherung geöffnet</h3>"+
        '<p class="hint">Beim Prüfen der Datei wurde Folgendes angepasst:</p>'+
        '<div class="report">'+r.hinweise.map(function(t){return '<div class="ri info"><span class="ri-txt">'+esc(t)+"</span></div>";}).join("")+"</div>";
    });
  }
}
