import { el, esc } from "../core/basis.js";
import { GENDERS, LEVEL_TXT, hasOwn } from "../core/konstanten.js";
import { kurztext } from "../core/schema.js";
import { NAMENSFORMATE, namensSchluessel, neuePerson, personSchluessel, reindex, vollName } from "../core/zustand.js";
import { schritt } from "./speicher.js";
import { S } from "../store.js";
import { renderClassTab } from "../ui/klasse-schueler.js";
import { toast } from "../ui/meldungen.js";
import { closeModal, openModal } from "../ui/modal.js";
import { ic } from "../ui/symbole.js";

/* ===================== Klassenliste aus CSV/Excel ===================== */
export function csvTeilen(text){
  text=String(text).replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
  var zeilen=text.split("\n"),erste="";
  for(var i=0;i<zeilen.length;i++)if(zeilen[i].trim()){erste=zeilen[i];break;}
  function zahl(z){return erste.split(z).length-1;}
  var tr=zahl("\t")?"\t":(zahl(";")&&zahl(";")>=zahl(",")?";":(zahl(",")?",":null));
  var rows=[],row=[],feld="",q=false,c;
  if(!tr){
    return zeilen.map(function(z){return[z.trim()];}).filter(function(r){return r[0];});
  }
  for(i=0;i<text.length;i++){
    c=text[i];
    if(q){
      if(c==='"'){if(text[i+1]==='"'){feld+='"';i++;}else q=false;}
      else feld+=c;
    }else if(c==='"'&&feld.trim()===""){q=true;feld="";}
    else if(c===tr){row.push(feld.trim());feld="";}
    else if(c==="\n"){row.push(feld.trim());rows.push(row);row=[];feld="";}
    else feld+=c;
  }
  row.push(feld.trim());rows.push(row);
  return rows.filter(function(r){return r.some(function(x){return x;});});
}
export function tabelleAusText(text){return csvTeilen(text);}
export function textDekodieren(buf){
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf);}
  catch(e){return new TextDecoder("windows-1252").decode(buf);}      /* Excel speichert CSV oft so */
}
/* Minimaler XLSX-Leser: ZIP-Verzeichnis lesen, Einträge entpacken, erste Tabelle auswerten */
function xlsxLesen(buf){
  var dv=new DataView(buf),u8=new Uint8Array(buf),eocd=-1,i;
  for(i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)return Promise.reject(new Error("Keine gültige Excel-Datei."));
  var anzahl=dv.getUint16(eocd+10,true),pos=dv.getUint32(eocd+16,true),eintraege={};
  var dec=new TextDecoder("utf-8");
  for(i=0;i<anzahl;i++){
    if(dv.getUint32(pos,true)!==0x02014b50)break;
    var methode=dv.getUint16(pos+10,true),groesse=dv.getUint32(pos+20,true);
    var nl=dv.getUint16(pos+28,true),xl=dv.getUint16(pos+30,true),kl=dv.getUint16(pos+32,true);
    var lokal=dv.getUint32(pos+42,true);
    var name=dec.decode(u8.subarray(pos+46,pos+46+nl));
    eintraege[name]={methode:methode,groesse:groesse,lokal:lokal};
    pos+=46+nl+xl+kl;
  }
  function lies(name){
    var e=eintraege[name];if(!e)return Promise.resolve(null);
    var nl=dv.getUint16(e.lokal+26,true),xl=dv.getUint16(e.lokal+28,true);
    var start=e.lokal+30+nl+xl,daten=u8.slice(start,start+e.groesse);
    if(e.methode===0)return Promise.resolve(dec.decode(daten));
    if(e.methode!==8)return Promise.reject(new Error("Unbekannte Kompression."));
    if(typeof DecompressionStream==="undefined")return Promise.reject(new Error("KEIN_ENTPACKEN"));
    var strom=new Blob([daten]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(strom).arrayBuffer().then(function(ab){return dec.decode(ab);});
  }
  var xml=function(t){return new DOMParser().parseFromString(t,"application/xml");};
  /* mit Namensraum-Joker, damit auch Dateien mit Präfix („x:row“) gelesen werden */
  var alle=function(doc,tag){return Array.prototype.slice.call(doc.getElementsByTagNameNS?doc.getElementsByTagNameNS("*",tag):doc.getElementsByTagName(tag));};
  return Promise.all([lies("xl/workbook.xml"),lies("xl/_rels/workbook.xml.rels"),lies("xl/sharedStrings.xml")]).then(function(r){
    if(!r[0])throw new Error("Keine gültige Excel-Datei.");
    var pfad="xl/worksheets/sheet1.xml";
    var blatt=alle(xml(r[0]),"sheet")[0];
    if(blatt&&r[1]){
      var rid=blatt.getAttribute("r:id")||blatt.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
      alle(xml(r[1]),"Relationship").forEach(function(rel){
        if(rel.getAttribute("Id")===rid){
          var ziel=rel.getAttribute("Target")||"";
          pfad=ziel.charAt(0)==="/"?ziel.slice(1):"xl/"+ziel.replace(/^\.\//,"");
        }
      });
    }
    var geteilt=r[2]?alle(xml(r[2]),"si").map(function(si){
      return alle(si,"t").map(function(t){return t.textContent;}).join("");
    }):[];
    return lies(pfad).then(function(t){
      if(!t)throw new Error("Die Excel-Datei enthält keine Tabelle.");
      var zeilen=[];
      alle(xml(t),"row").forEach(function(rw){
        var z=[];
        alle(rw,"c").forEach(function(c){
          var ref=c.getAttribute("r")||"",m=/^([A-Z]+)/.exec(ref),sp=0;
          if(m){for(var q=0;q<m[1].length;q++)sp=sp*26+(m[1].charCodeAt(q)-64);sp--;}else sp=z.length;
          var typ=c.getAttribute("t"),v=alle(c,"v")[0],wert;
          if(typ==="s")wert=geteilt[parseInt(v?v.textContent:"-1",10)]||"";
          else if(typ==="inlineStr")wert=alle(c,"t").map(function(x){return x.textContent;}).join("");
          else wert=v?v.textContent:"";
          while(z.length<sp)z.push("");
          z[sp]=String(wert).trim();
        });
        if(z.some(function(x){return x;}))zeilen.push(z);
      });
      return zeilen;
    });
  });
}
export function listeAusDatei(f){
  var name=(f.name||"").toLowerCase();
  if(/\.xls$/.test(name)){toast("Ältere .xls-Dateien bitte in Excel als .xlsx oder CSV speichern.","w");return;}
  if(f.size>5*1024*1024){toast("Die Datei ist zu groß für eine Klassenliste.","d");return;}
  var fr=new FileReader();
  fr.onload=function(){
    var buf=fr.result;
    var kopf=new Uint8Array(buf.slice(0,4));
    var istZip=kopf[0]===0x50&&kopf[1]===0x4b&&kopf[2]===3&&kopf[3]===4;   /* „PK\3\4“ */
    if(istZip){
      xlsxLesen(buf).then(function(z){listeVorschau(z,f.name);}).catch(function(e){
        toast(e&&e.message==="KEIN_ENTPACKEN"?"Dieser Browser kann Excel-Dateien nicht direkt lesen. Bitte die Liste in Excel als CSV speichern."
          :"Die Excel-Datei konnte nicht gelesen werden. Tipp: in Excel als CSV speichern.","d");
      });
    }else listeVorschau(csvTeilen(textDekodieren(buf)),f.name);
  };
  fr.onerror=function(){toast("Die Datei konnte nicht gelesen werden.","d");};
  fr.readAsArrayBuffer(f);
}
/* Kopfzeile erkennen und Einträge ableiten */
export function personenAusTabelle(rows){
  var res={eintraege:[],kopf:false,vorNach:false,spalten:{}};
  if(!rows.length)return res;
  var k=rows[0].map(function(x){return String(x).toLowerCase().replace(/[^a-zäöüß\/:]/g,"");}),sp={};
  k.forEach(function(x,i){
    if(!x)return;
    if(/vorname|rufname|first/.test(x))sp.vor=sp.vor===undefined?i:sp.vor;
    else if(/nachname|familienname|zuname|last|surname/.test(x))sp.nach=sp.nach===undefined?i:sp.nach;
    else if(/^(name|schüler.*|schueler.*|kind|person|namen)$/.test(x))sp.name=sp.name===undefined?i:sp.name;
    else if(/geschlecht|gender|^sex$|^mw$|^m\/w/.test(x))sp.g=i;
    else if(/niveau|leistung|stärke|staerke|level/.test(x))sp.l=i;
    else if(/hinweis|bemerkung|notiz|anmerkung|kommentar/.test(x))sp.h=i;
  });
  res.kopf=(sp.vor!==undefined||sp.nach!==undefined||sp.name!==undefined);
  var daten=res.kopf?rows.slice(1):rows;
  if(!res.kopf)sp={name:0};
  res.spalten=sp;res.vorNach=(sp.vor!==undefined&&sp.nach!==undefined);
  function gw(v){
    v=String(v||"").toLowerCase().trim();
    if(/^(w|weibl|weiblich|f|female|mädchen|maedchen)\.?$/.test(v))return"w";
    if(/^(m|männl|maennl|männlich|maennlich|male|junge)\.?$/.test(v))return"m";
    if(/^(d|divers|x)\.?$/.test(v))return"d";
    return"x";
  }
  function lv(v){
    v=String(v||"").toLowerCase().trim();
    if(/^(3|a|stark|hoch|gut|sehr gut)$/.test(v))return 3;
    if(/^(1|c|schwach|niedrig|unterstützung|unterstuetzung|förderung|foerderung|benötigt unterstützung)$/.test(v)||/unterst/.test(v))return 1;
    return 2;
  }
  daten.forEach(function(r){
    var vor="",nach="",voll="";
    if(res.vorNach){vor=kurztext(r[sp.vor],40);nach=kurztext(r[sp.nach],40);}
    else if(sp.vor!==undefined){vor=kurztext(r[sp.vor],40);}
    else if(sp.nach!==undefined&&sp.name===undefined){nach=kurztext(r[sp.nach],40);}
    else{
      voll=kurztext(r[sp.name!==undefined?sp.name:0],60);
      var komma=voll.indexOf(",");
      if(komma>0){nach=voll.slice(0,komma).trim();vor=voll.slice(komma+1).trim();}
      else{var teile=voll.split(/\s+/);if(teile.length>1){nach=teile.pop();vor=teile.join(" ");}else vor=voll;}
    }
    if(!vor&&!nach&&!voll)return;
    res.eintraege.push({vor:vor,nach:nach,voll:voll||(vor+(nach?" "+nach:"")).trim(),
      gender:sp.g!==undefined?gw(r[sp.g]):"x",level:sp.l!==undefined?lv(r[sp.l]):2,
      note:sp.h!==undefined?kurztext(r[sp.h],300):""});
  });
  return res;
}
export function namenBilden(eintraege,format){
  var zaehl={};
  eintraege.forEach(function(e){var v=(e.vor||e.nach||e.voll||"").toLowerCase();zaehl[v]=(zaehl[v]||0)+1;});
  var namen=eintraege.map(function(e){
    if(format==="datei")return e.voll;
    if(format==="voll")return vollName(e.vor,e.nach)||e.voll;
    if(format==="nachVor")return e.nach?(e.nach+", "+e.vor):e.voll;
    if(format==="vornameN")return e.vor?e.vor+(e.nach?" "+e.nach.charAt(0)+".":""):(e.nach||e.voll);
    /* „vorname“: nur Vorname, bei gleichen Vornamen mit Anfangsbuchstaben des Nachnamens */
    var v=e.vor||e.nach||e.voll;
    return(e.vor&&zaehl[v.toLowerCase()]>1&&e.nach)?v+" "+e.nach.charAt(0)+".":v;
  });
  /* falls danach noch Doppelte bleiben: voller Name */
  var z2={};namen.forEach(function(n){z2[n.toLowerCase()]=(z2[n.toLowerCase()]||0)+1;});
  return namen.map(function(n,i){
    return(z2[n.toLowerCase()]>1&&eintraege[i].nach)?vollName(eintraege[i].vor,eintraege[i].nach):n;
  });
}
/* Gleiche Namen in einer neuen Liste finden – untereinander und (beim Ergänzen) mit der Klasse */
export function dublettenVon(eintraege,modus){
  var g={};
  function gruppe(k){return g[k]||(g[k]={alt:[],neu:[]});}
  if(modus!=="ersetzen")S.state.students.forEach(function(s){var k=personSchluessel(s);if(k)gruppe(k).alt.push(s);});
  eintraege.forEach(function(e,i){
    if(e.weg)return;
    var k=namensSchluessel(e.vor,e.nach);if(!k)return;
    gruppe(k).neu.push(i);
  });
  return Object.keys(g).filter(function(k){return g[k].neu.length&&g[k].alt.length+g[k].neu.length>1;})
    .map(function(k){return g[k];});
}
export function listeVorschau(rows,quelle){listeVorschauInfo(personenAusTabelle(rows),quelle);}
export function listeVorschauInfo(info,quelle){
  if(!info.eintraege.length){toast("In der Liste wurden keine Namen gefunden.","w");return;}
  var E=info.eintraege;
  E.forEach(function(e){e.vor=kurztext(e.vor,60);e.nach=kurztext(e.nach,60);e.weg=false;});
  var format=hasOwn(NAMENSFORMATE,S.state.options.nameFormat)?S.state.options.nameFormat:"voll";
  var modus="ergaenzen";
  openModal(function(b){
    b.innerHTML="<h3>Klassenliste übernehmen</h3>"+
      '<p class="hint">Quelle: '+esc(quelle)+". "+(info.kopf?"Überschriften erkannt: "+
        ["name","vor","nach","g","l","h"].filter(function(k){return info.spalten[k]!==undefined;}).map(function(k){
          return{name:"Name",vor:"Vorname",nach:"Nachname",g:"Geschlecht",l:"Leistungsstärke",h:"Hinweis"}[k];}).join(", ")+"."
        :(info.spalten&&info.spalten.name!==undefined?"Keine Überschriftenzeile erkannt – die erste Spalte wird als Name verwendet, das letzte Wort als Nachname.":"Das letzte Wort jedes Namens wird als Nachname übernommen."))+"</p>"+
      '<p id="lvZahl" style="margin:6px 0;font-weight:600;font-size:14px"></p>'+
      '<div id="lvChips" class="chiplist"></div>'+
      '<div id="lvDup"></div>'+
      '<div class="rowf" style="margin:8px 0"><label for="lvFormat" style="font-size:13.5px">Namen im Plan anzeigen als</label><select id="lvFormat">'+
        Object.keys(NAMENSFORMATE).map(function(k){return '<option value="'+k+'">'+NAMENSFORMATE[k]+"</option>";}).join("")+"</select></div>"+
      '<div style="margin:8px 0"><label style="display:block;margin:3px 0"><input type="radio" name="lvModus" value="ergaenzen" checked> zur Klassenliste hinzufügen</label>'+
      '<label style="display:block;margin:3px 0"><input type="radio" name="lvModus" value="ersetzen"> Klassenliste ersetzen (bisherige Schüler:innen, ihre Regeln und die Sitzordnung werden entfernt)</label></div>'+
      '<div class="rowf" style="justify-content:flex-end;margin-top:10px"><button id="lvAbbr" type="button">Abbrechen</button>'+
      '<button id="lvGo" class="btn primary" type="button">Übernehmen</button></div>';
    function klaerenBauen(){
      var gr=dublettenVon(E,modus),box=el("lvDup");
      if(!gr.length){box.innerHTML="";return;}
      var mitAlt=gr.some(function(g){return g.alt.length;});
      var h='<div class="dupbox" role="group" aria-labelledby="lvDupT"><div class="dup-h" id="lvDupT">'+ic("alert")+
        "<strong>Gleiche Namen – bitte unterscheiden</strong></div>"+
        '<p>Jede Person braucht einen eindeutigen Namen. Ergänze z. B. den Nachnamen oder einen Anfangsbuchstaben. '+
        (mitAlt?"Steht jemand schon in der Klasse, lass den Eintrag einfach weg.":"Ist ein Eintrag doppelt erfasst, lass ihn weg.")+"</p>";
      gr.forEach(function(g){
        h+='<div class="dupgrp">';
        g.alt.forEach(function(s){h+='<div class="duprow alt"><span>'+esc(s.name)+'</span><span class="muted">schon in der Klasse</span></div>';});
        g.neu.forEach(function(i){
          var e=E[i];
          h+='<div class="duprow" data-i="'+i+'">'+
            '<input type="text" data-feld="vor" value="'+esc(e.vor)+'" placeholder="Vorname" aria-label="Vorname, Eintrag '+(i+1)+'" maxlength="60">'+
            '<input type="text" data-feld="nach" value="'+esc(e.nach)+'" placeholder="Nachname" aria-label="Nachname, Eintrag '+(i+1)+'" maxlength="60">'+
            '<label class="check sm"><input type="checkbox" data-weg'+(e.weg?" checked":"")+"><span>weglassen</span></label>"+
            '<span class="dupstat"></span></div>';
        });
        h+="</div>";
      });
      if(mitAlt)h+='<button type="button" class="btn sm" id="lvWegAlle">Alle schon vorhandenen weglassen</button>';
      h+="</div>";
      box.innerHTML=h;
      box.querySelectorAll(".duprow[data-i]").forEach(function(r){
        var i=+r.dataset.i;
        r.querySelectorAll("input[data-feld]").forEach(function(inp){
          inp.oninput=function(){E[i][inp.dataset.feld]=kurztext(inp.value,60);E[i].voll=vollName(E[i].vor,E[i].nach);aktualisieren();};
        });
        r.querySelector("[data-weg]").onchange=function(){E[i].weg=this.checked;r.classList.toggle("weg",this.checked);aktualisieren();};
      });
      if(el("lvWegAlle"))el("lvWegAlle").onclick=function(){
        var vorhanden={};S.state.students.forEach(function(s){vorhanden[personSchluessel(s)]=1;});
        E.forEach(function(e,i){
          if(vorhanden[namensSchluessel(e.vor,e.nach)]){
            e.weg=true;var cb=b.querySelector('.duprow[data-i="'+i+'"] [data-weg]');if(cb){cb.checked=true;cb.closest(".duprow").classList.add("weg");}
          }
        });
        aktualisieren();
      };
    }
    function aktualisieren(){
      var gr=dublettenVon(E,modus),offen={};
      gr.forEach(function(g){g.neu.forEach(function(i){offen[i]=1;});});
      var neu=0,chips="";
      E.forEach(function(e,i){
        var nm=vollName(e.vor,e.nach);
        if(!e.weg&&nm)neu++;
        var zus=[];
        if(e.gender!=="x")zus.push(GENDERS[e.gender].short);
        if(info.spalten&&info.spalten.l!==undefined)zus.push(LEVEL_TXT[e.level]);
        if(i<80)chips+='<span class="'+(e.weg?"dup":offen[i]?"konflikt":"")+'" title="'+(e.weg?"wird weggelassen":offen[i]?"Name kommt mehrfach vor":"")+'">'+
          esc(nm||"–")+(zus.length?' <span class="muted">('+esc(zus.join(", "))+")</span>":"")+"</span>";
      });
      if(E.length>80)chips+="<span>… und "+(E.length-80)+" weitere</span>";
      el("lvChips").innerHTML=chips;
      b.querySelectorAll("#lvDup .duprow[data-i]").forEach(function(r){
        var i=+r.dataset.i,bad=!!offen[i],st=r.querySelector(".dupstat");
        r.classList.toggle("ok",!bad);
        r.querySelectorAll("input[data-feld]").forEach(function(x){if(bad)x.setAttribute("aria-invalid","true");else x.removeAttribute("aria-invalid");});
        st.innerHTML=E[i].weg?"wird weggelassen":bad?ic("alert","sm")+"noch doppelt":ic("check","sm")+"eindeutig";
      });
      var n=Object.keys(offen).length;
      el("lvZahl").textContent=E.length+" Einträge erkannt"+(n?" · "+n+(n===1?" Name kommt":" Namen kommen")+" mehrfach vor – bitte unterscheiden."
        :(neu<E.length?" · "+neu+" werden übernommen.":"."));
      el("lvGo").textContent=n?"Erst Namen unterscheiden":(neu?neu+" übernehmen":"Übernehmen");
      el("lvGo").disabled=!!n||!neu;
    }
    el("lvFormat").value=format;
    el("lvFormat").onchange=function(){format=this.value;};
    b.querySelectorAll('input[name=lvModus]').forEach(function(r){r.onchange=function(){modus=r.value;klaerenBauen();aktualisieren();};});
    el("lvAbbr").onclick=closeModal;
    el("lvGo").onclick=function(){
      if(dublettenVon(E,modus).length){aktualisieren();return;}
      schritt(modus==="ersetzen"?"Klassenliste ersetzt":"Klassenliste ergänzt");
      if(modus==="ersetzen"){
        S.state.students=[];S.state.blacklist=[];S.state.whitelist=[];S.state.arrangement={};
      }
      var n=0;
      E.forEach(function(e){
        if(e.weg||!vollName(e.vor,e.nach))return;
        S.state.students.push(neuePerson(e.vor,e.nach,{gender:e.gender,level:e.level,note:e.note}));
        n++;
      });
      S.state.options.nameFormat=format;
      reindex();closeModal();
      if(el("bulk"))el("bulk").value="";
      if(S.tab==="class")renderClassTab();
      toast(n+" Schüler:innen übernommen.");
    };
    klaerenBauen();aktualisieren();
    if(b.querySelector("#lvDup .duprow input"))setTimeout(function(){var f=b.querySelector("#lvDup .duprow input[data-feld=nach]");if(f)f.focus();},30);
  });
}
