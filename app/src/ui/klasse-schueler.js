import { el, esc } from "../core/basis.js";
import { GENDERS } from "../core/konstanten.js";
import { LEHRER_STUFEN, hatLehrertisch, lehrerStufe, lehrerText, tagById } from "../core/regeln.js";
import { kurztext } from "../core/schema.js";
import { doppelteNamen, nameTeilen, namensSchluessel, neuePerson, personSchluessel, reindex, vollName } from "../core/zustand.js";
import { dublettenVon, listeAusDatei, listeVorschau, listeVorschauInfo, tabelleAusText } from "../io/listen-import.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { buildOpts } from "./klasse-einstellungen.js";
import { buildTags } from "./klasse-merkmale.js";
import { buildRules } from "./klasse-regeln.js";
import { ansage, confirmBox, toast } from "./meldungen.js";
import { ic } from "./symbole.js";

/* ===================== Klasse ===================== */
S.klasseReiter="schueler";
var KLASSE_REITER=[["schueler","users","Schüler:innen"],["regeln","split","Regeln"],["merkmale","tag","Platzmerkmale"],["einstellungen","sliders","Einstellungen"]];
function klassenZahl(id){
  if(id==="schueler")return S.state.students.length;
  if(id==="regeln")return S.state.blacklist.length+S.state.whitelist.length;
  if(id==="merkmale")return S.state.tags.length;
  return "";
}
export function renderClassTab(){
  var pane=el("classPane");
  pane.innerHTML='<div class="page-head"><div><h1>Klasse</h1>'+
      "<p>Personen, Regeln und Einstellungen. Änderungen wirken beim nächsten „Neu anordnen“.</p></div></div>"+
    '<div class="seg subtabs" role="tablist" aria-label="Bereiche der Klasse">'+
      KLASSE_REITER.map(function(r){
        var an=r[0]===S.klasseReiter,z=klassenZahl(r[0]);
        return '<button type="button" role="tab" id="kr_'+r[0]+'" data-kr="'+r[0]+'" aria-selected="'+(an?"true":"false")+'"'+
          (an?' class="on"':' tabindex="-1"')+">"+ic(r[1],"sm")+"<span>"+r[2]+"</span>"+
          (z!==""?'<span class="count" data-krz="'+r[0]+'">'+z+"</span>":"")+"</button>";
      }).join("")+
    "</div>"+
    '<div id="clsBody" role="tabpanel" aria-labelledby="kr_'+S.klasseReiter+'"></div>';
  var leiste=pane.querySelector(".subtabs");
  leiste.querySelectorAll("[data-kr]").forEach(function(b){
    b.onclick=function(){S.klasseReiter=b.dataset.kr;renderClassTab();setTimeout(function(){var x=el("kr_"+S.klasseReiter);if(x)x.focus();},0);};
  });
  leiste.addEventListener("keydown",function(e){
    var r=Array.prototype.slice.call(leiste.querySelectorAll("[data-kr]")),i=r.indexOf(document.activeElement),j=null;
    if(i<0)return;
    if(e.key==="ArrowRight")j=(i+1)%r.length;else if(e.key==="ArrowLeft")j=(i-1+r.length)%r.length;
    else if(e.key==="Home")j=0;else if(e.key==="End")j=r.length-1;
    if(j===null)return;
    e.preventDefault();r[j].focus();
  });
  var b=el("clsBody");
  if(S.klasseReiter==="regeln")buildRules(b);
  else if(S.klasseReiter==="merkmale")buildTags(b);
  else if(S.klasseReiter==="einstellungen")buildOpts(b);
  else buildClass(b);
}
export function klassenZaehler(){
  document.querySelectorAll("[data-krz]").forEach(function(s){s.textContent=klassenZahl(s.dataset.krz);});
}

/* ---- Schüler:innen ---- */
S.stuOffen={};
S.stuAlleOffen=false;
S.stuSuche="";
S.stuSort="eingabe";
S.stuSortAb=false;
S.stuFilterG="";
S.stuFilterL="";
S.stuAuswahl={};
var SORT_ART={eingabe:"Eingabe-Reihenfolge",vorname:"Vorname",nachname:"Nachname",geschlecht:"Geschlecht",leistung:"Leistung"};
var GESCHLECHT_REIHE={w:0,m:1,d:2,x:3};
function richtungsText(){
  var ab=S.stuSortAb;
  if(S.stuSort==="leistung")return ab?"Unterstützung zuerst":"stark zuerst";
  if(S.stuSort==="geschlecht")return ab?"ohne Angabe zuerst":"w, m, d";
  if(S.stuSort==="eingabe")return ab?"neueste zuerst":"älteste zuerst";
  return ab?"Z–A":"A–Z";
}
function buildClass(b){
  b.innerHTML=
    '<div class="card">'+
      '<div class="card-h">'+ic("plus")+"<h2>Personen hinzufügen</h2></div>"+
      '<div class="formgrid">'+
        '<label class="field">Vorname<input type="text" id="nsVor" autocomplete="off" maxlength="60"></label>'+
        '<label class="field">Nachname<input type="text" id="nsNach" autocomplete="off" maxlength="60"></label>'+
        '<label class="field">Geschlecht<select id="nsGender">'+Object.keys(GENDERS).map(function(g){
          return '<option value="'+g+'"'+(g==="x"?" selected":"")+">"+GENDERS[g].label+"</option>";}).join("")+"</select></label>"+
        '<label class="field">Leistungsstärke<select id="nsLevel"><option value="3">stark</option><option value="2" selected>mittel</option>'+
          '<option value="1">benötigt Unterstützung</option></select></label>'+
        '<div class="field"><span aria-hidden="true">&nbsp;</span><button type="button" id="nsAdd" class="btn primary">'+ic("plus")+"Hinzufügen</button></div>"+
      "</div>"+
      '<p id="nsFehler" class="feldfehler" role="alert" hidden></p>'+
      '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">'+
        '<label class="field" for="bulk">Mehrere auf einmal</label>'+
        '<div class="rowf" style="margin-top:5px"><input type="text" id="bulk" placeholder="Anna Schmidt, Ben Braun … oder direkt aus Excel einfügen" style="flex:1 1 260px">'+
        '<button type="button" id="bulkAdd" class="btn">Übernehmen</button>'+
        '<button type="button" id="listFile" class="btn ghost">'+ic("sheet")+"Aus Datei (CSV, Excel) …</button>"+
        '<input type="file" id="listIn" accept=".csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></div>'+
        '<p class="hint" style="margin-bottom:0">Namen durch Komma, Semikolon oder Zeilenumbruch trennen – der Nachname steht jeweils zuletzt. Eine Spalte oder Tabelle aus Excel einfach einfügen, dann erscheint eine Vorschau.</p>'+
      "</div>"+
    "</div>"+
    '<div class="card">'+
      '<div class="stu-tools" role="group" aria-label="Suchen, filtern und sortieren">'+
        '<div class="search">'+ic("search")+'<input type="search" id="stuSearch" placeholder="Namen suchen" aria-label="Namen suchen" value="'+esc(S.stuSuche)+'"></div>'+
        '<select id="stuFilterG" aria-label="Nach Geschlecht filtern"><option value="">Alle Geschlechter</option>'+
          Object.keys(GENDERS).map(function(g){return '<option value="'+g+'">'+GENDERS[g].label+"</option>";}).join("")+"</select>"+
        '<select id="stuFilterL" aria-label="Nach Leistung filtern"><option value="">Alle Leistungsstände</option>'+
          '<option value="3">stark</option><option value="2">mittel</option><option value="1">benötigt Unterstützung</option></select>'+
        '<span class="sortgrp"><label for="stuSortSel" class="toollbl">Sortieren</label><select id="stuSortSel">'+
          Object.keys(SORT_ART).map(function(k){return '<option value="'+k+'">'+SORT_ART[k]+"</option>";}).join("")+"</select>"+
          '<button type="button" class="btn sm ghost" id="stuSortDir"></button></span>'+
        '<button type="button" class="btn sm ghost" id="stuFilterAus" hidden>'+ic("x","sm")+"Filter aufheben</button>"+
        '<span class="spacer"></span>'+
        '<button type="button" class="btn ghost" id="stuToggleAll">'+(S.stuAlleOffen?"Details schließen":"Alle Details zeigen")+"</button>"+
      "</div>"+
      '<div id="stuDup"></div>'+
      '<div id="stuBulk"></div>'+
      '<div id="stuList"></div>'+
    "</div>";

  function fehler(t,feld){
    var f=el("nsFehler");f.textContent=t||"";f.hidden=!t;
    ["nsVor","nsNach"].forEach(function(id){el(id).removeAttribute("aria-invalid");});
    if(feld){el(feld).setAttribute("aria-invalid","true");el(feld).focus();}
  }
  function addStudent(){
    var vor=kurztext(el("nsVor").value,60),nach=kurztext(el("nsNach").value,60);
    if(!vor&&!nach){fehler("Bitte einen Vornamen eingeben.","nsVor");return;}
    var k=namensSchluessel(vor,nach);
    if(S.state.students.some(function(s){return personSchluessel(s)===k;})){
      fehler("„"+vollName(vor,nach)+"“ gibt es schon in der Klasse. Bitte zur Unterscheidung den Nachnamen ergänzen – ein Anfangsbuchstabe genügt.","nsNach");
      return;
    }
    fehler("");
    schritt("Person hinzugefügt");
    var p=neuePerson(vor,nach,{gender:el("nsGender").value,level:parseInt(el("nsLevel").value,10)});
    S.state.students.push(p);
    el("nsVor").value="";el("nsNach").value="";el("nsVor").focus();reindex();drawStuList();
    ansage(p.name+" hinzugefügt.");
  }
  el("nsAdd").onclick=addStudent;
  ["nsVor","nsNach"].forEach(function(id){
    el(id).addEventListener("keydown",function(e){if(e.key==="Enter")addStudent();});
    el(id).addEventListener("input",function(){if(!el("nsFehler").hidden)fehler("");});
  });
  el("bulkAdd").onclick=function(){
    var raw=el("bulk").value;if(!raw.trim())return;
    var eintraege=raw.split(/[,;\n\t]/).map(function(x){return kurztext(x,60);}).filter(Boolean).map(function(n){
      var t=nameTeilen(n);return{vor:t.vor,nach:t.nach,voll:n,gender:"x",level:2,note:""};
    });
    if(!eintraege.length)return;
    /* gleiche Namen: erst unterscheiden lassen */
    if(dublettenVon(eintraege,"ergaenzen").length){
      listeVorschauInfo({eintraege:eintraege,kopf:false,vorNach:false,spalten:{}},"Eingabe im Feld „Mehrere auf einmal“");
      return;
    }
    schritt("Namensliste übernommen");
    eintraege.forEach(function(e){S.state.students.push(neuePerson(e.vor,e.nach));});
    el("bulk").value="";reindex();drawStuList();toast(eintraege.length+" Schüler:innen hinzugefügt.");
  };
  el("bulk").addEventListener("keydown",function(e){if(e.key==="Enter")el("bulkAdd").click();});
  /* Aus Excel eingefügte Spalten/Tabellen direkt als Liste übernehmen */
  el("bulk").addEventListener("paste",function(e){
    var t=(e.clipboardData||window.clipboardData);t=t?t.getData("text"):"";
    if(t&&/[\n\t]/.test(t.trim())){e.preventDefault();listeVorschau(tabelleAusText(t),"Eingefügte Liste");}
  });
  el("listFile").onclick=function(){el("listIn").click();};
  el("listIn").onchange=function(e){
    var f=e.target.files&&e.target.files[0];e.target.value="";
    if(f)listeAusDatei(f);
  };
  el("stuSearch").oninput=function(){S.stuSuche=this.value;drawStuList();};
  el("stuFilterG").onchange=function(){S.stuFilterG=this.value;drawStuList();};
  el("stuFilterL").onchange=function(){S.stuFilterL=this.value;drawStuList();};
  el("stuSortSel").onchange=function(){S.stuSort=this.value;S.stuSortAb=false;drawStuList();};
  el("stuSortDir").onclick=function(){S.stuSortAb=!S.stuSortAb;drawStuList();setTimeout(function(){el("stuSortDir").focus();},0);};
  el("stuFilterAus").onclick=function(){
    S.stuFilterG="";S.stuFilterL="";S.stuSuche="";el("stuSearch").value="";drawStuList();el("stuSearch").focus();
  };
  el("stuToggleAll").onclick=function(){
    S.stuAlleOffen=!S.stuAlleOffen;S.stuOffen={};
    if(S.stuAlleOffen)S.state.students.forEach(function(s){S.stuOffen[s.id]=1;});
    this.textContent=S.stuAlleOffen?"Details schließen":"Alle Details zeigen";
    drawStuList();
  };
  drawStuList();
}
function stuLoeschen(ids){
  var weg={};ids.forEach(function(i){weg[i]=1;});
  S.state.students=S.state.students.filter(function(x){return !weg[x.id];});
  [S.state.blacklist,S.state.whitelist].forEach(function(L){
    L.forEach(function(g){g.members=g.members.filter(function(m){return !weg[m];});});
  });
  S.state.blacklist=S.state.blacklist.filter(function(g){return g.members.length>1;});
  S.state.whitelist=S.state.whitelist.filter(function(g){return g.members.length>1;});
  Object.keys(S.state.arrangement).forEach(function(k){if(weg[S.state.arrangement[k]])delete S.state.arrangement[k];});
  ids.forEach(function(i){delete S.stuAuswahl[i];delete S.stuOffen[i];});
  reindex();
}
function filterAktiv(){return !!(S.stuSuche.trim()||S.stuFilterG||S.stuFilterL);}
function sichtbareSchueler(){
  var q=S.stuSuche.trim().toLowerCase();
  var l=S.state.students.filter(function(s){
    if(q&&(s.name+" "+(S.ANZEIGE[s.id]||"")).toLowerCase().indexOf(q)===-1)return false;
    if(S.stuFilterG&&s.gender!==S.stuFilterG)return false;
    if(S.stuFilterL&&String(s.level)!==S.stuFilterL)return false;
    return true;
  });
  function de(a,b){return String(a||"").localeCompare(String(b||""),"de",{sensitivity:"base"});}
  var cmp=null;
  if(S.stuSort==="vorname")cmp=function(a,b){return de(a.vorname,b.vorname)||de(a.nachname,b.nachname);};
  else if(S.stuSort==="nachname")cmp=function(a,b){return de(a.nachname,b.nachname)||de(a.vorname,b.vorname);};
  else if(S.stuSort==="geschlecht")cmp=function(a,b){return GESCHLECHT_REIHE[a.gender]-GESCHLECHT_REIHE[b.gender]||de(a.vorname,b.vorname);};
  else if(S.stuSort==="leistung")cmp=function(a,b){return b.level-a.level||de(a.vorname,b.vorname);};
  if(cmp)l=l.slice().sort(cmp);
  if(S.stuSortAb)l=l.slice().reverse();
  return l;
}
/* Hinweis und Markierung bei gleichen Namen */
function stuDupAnzeigen(){
  var box=el("stuDup");if(!box)return;
  var g=doppelteNamen(S.state.students),ids={};
  g.forEach(function(l){l.forEach(function(s){ids[s.id]=1;});});
  box.innerHTML=g.length?'<div class="callout warn" role="alert" style="margin-bottom:12px">'+ic("alert")+"<span><strong>Gleiche Namen:</strong> "+
    g.map(function(l){return "„"+esc(l[0].name)+"“ ("+l.length+"×)";}).join(", ")+
    ". Bitte bei diesen Personen den Nachnamen oder einen Anfangsbuchstaben ergänzen, damit jede eindeutig ist.</span></div>":"";
  document.querySelectorAll("#stuList .stu[data-sid]").forEach(function(r){
    var an=!!ids[r.dataset.sid];r.classList.toggle("dup",an);
    r.querySelectorAll(".stu-vor,.stu-nach").forEach(function(i){
      if(an)i.setAttribute("aria-invalid","true");else if(!i.classList.contains("fehler"))i.removeAttribute("aria-invalid");
    });
  });
}
function drawStuBulk(){
  var box=el("stuBulk");if(!box)return;
  Object.keys(S.stuAuswahl).forEach(function(id){if(!S.STU[id])delete S.stuAuswahl[id];});
  var ids=Object.keys(S.stuAuswahl);
  if(!ids.length){box.innerHTML="";return;}
  box.innerHTML='<div class="bulkbar" role="group" aria-label="Sammeländerung">'+
    "<span>"+ids.length+" ausgewählt</span>"+
    '<select id="bkLevel" aria-label="Leistungsstärke setzen"><option value="">Leistung setzen …</option><option value="3">stark</option><option value="2">mittel</option><option value="1">benötigt Unterstützung</option></select>'+
    '<select id="bkGender" aria-label="Geschlecht setzen"><option value="">Geschlecht setzen …</option>'+Object.keys(GENDERS).map(function(g){return '<option value="'+g+'">'+GENDERS[g].label+"</option>";}).join("")+"</select>"+
    (S.state.tags.length?'<select id="bkTag" aria-label="Platzwunsch ändern"><option value="">Platzwunsch …</option>'+
      S.state.tags.map(function(t){return '<option value="+'+t.id+'">+ '+esc(t.name)+'</option><option value="-'+t.id+'">− '+esc(t.name)+"</option>";}).join("")+"</select>":"")+
    '<select id="bkSolo" aria-label="Einzelplatz"><option value="">Einzelplatz …</option><option value="1">sitzen allein</option><option value="0">nicht allein</option></select>'+
    '<select id="bkLehrer" aria-label="Nah am Lehrertisch"><option value="">Lehrertisch …</option><option value="standard">nah – Standard (bis '+LEHRER_STUFEN.standard.radius+' Felder)</option>'+
      '<option value="weich">nah – weich (bis '+LEHRER_STUFEN.weich.radius+' Felder)</option><option value="0">nicht nötig</option></select>'+
    '<span class="spacer"></span>'+
    '<button type="button" class="btn sm danger" id="bkDel">'+ic("trash","sm")+"Entfernen</button>"+
    '<button type="button" class="btn sm ghost" id="bkClear">Auswahl aufheben</button></div>';
  function jeder(label,fn){
    schritt(label);
    ids.forEach(function(id){if(S.STU[id])fn(S.STU[id]);});
    drawStuList();toast(label+": "+ids.length+" Personen.");
  }
  el("bkLevel").onchange=function(){var v=parseInt(this.value,10);if(v)jeder("Leistung geändert",function(s){s.level=v;});};
  el("bkGender").onchange=function(){var v=this.value;if(v)jeder("Geschlecht geändert",function(s){s.gender=v;});};
  if(el("bkTag"))el("bkTag").onchange=function(){
    var v=this.value;if(!v)return;
    var an=v.charAt(0)==="+",tid=v.slice(1);
    jeder(an?"Platzwunsch gesetzt":"Platzwunsch entfernt",function(s){
      var i=s.requiredTags.indexOf(tid);
      if(an&&i===-1)s.requiredTags.push(tid);
      if(!an&&i!==-1)s.requiredTags.splice(i,1);
    });
  };
  el("bkSolo").onchange=function(){var v=this.value;if(v)jeder(v==="1"?"Einzelplatz gesetzt":"Einzelplatz aufgehoben",function(s){s.solo=(v==="1");});};
  el("bkLehrer").onchange=function(){
    var v=this.value;if(!v)return;
    var neu=(v==="standard"||v==="weich")?v:false;
    jeder(neu?"Nah am Lehrertisch: "+LEHRER_STUFEN[neu].name:"Nah am Lehrertisch aufgehoben",function(s){s.lehrer=neu;});
    if(neu&&!hatLehrertisch())toast("Im Raum steht noch kein Lehrertisch – die Regel ruht, bis einer aufgestellt ist.","w");
  };
  el("bkDel").onclick=function(){
    confirmBox(ids.length+(ids.length===1?" Person":" Personen")+" entfernen? Auch ihre Regeln und Plätze werden entfernt.",function(){
      schritt(ids.length+" Personen entfernt");stuLoeschen(ids);drawStuList();
    },null,{ja:"Entfernen",gefahr:true});
  };
  el("bkClear").onclick=function(){S.stuAuswahl={};drawStuList();};
}
function drawStuList(){
  var box=el("stuList");if(!box)return;
  reindex();
  klassenZaehler();
  drawStuBulk();
  /* Werkzeugleiste auf den aktuellen Stand bringen */
  if(el("stuSortSel")){
    el("stuSortSel").value=S.stuSort;el("stuFilterG").value=S.stuFilterG;el("stuFilterL").value=S.stuFilterL;
    var dir=el("stuSortDir");
    dir.innerHTML=ic(S.stuSortAb?"sortAb":"sortAuf","sm")+"<span>"+richtungsText()+"</span>";
    dir.setAttribute("aria-label","Reihenfolge umkehren, jetzt: "+richtungsText());
    el("stuFilterAus").hidden=!filterAktiv();
  }
  if(!S.state.students.length){
    box.innerHTML='<div class="empty" style="padding:18px 4px">'+ic("users","lg")+'<strong style="color:var(--text);font-size:16px">Noch keine Schüler:innen</strong>'+
      "<span>Oben einzeln eintragen, eine Liste einfügen oder eine CSV- bzw. Excel-Datei übernehmen.</span></div>";
    stuDupAnzeigen();
    return;
  }
  var liste=sichtbareSchueler();
  var alleGewaehlt=liste.length&&liste.every(function(s){return S.stuAuswahl[s.id];});
  var regelZahl={};
  [["bl",S.state.blacklist],["wl",S.state.whitelist]].forEach(function(x){
    x[1].forEach(function(g){if(g.members.length<2)return;g.members.forEach(function(m){
      regelZahl[m]=regelZahl[m]||{bl:0,wl:0};regelZahl[m][x[0]]++;});});
  });
  function kopf(art,text){
    var an=S.stuSort===art;
    return '<span role="columnheader" aria-sort="'+(an?(S.stuSortAb?"descending":"ascending"):"none")+'">'+
      '<button type="button" class="thsort'+(an?" on":"")+'" data-sort="'+art+'" title="Nach '+text+' sortieren">'+text+
      (an?ic(S.stuSortAb?"sortAb":"sortAuf","sm"):"")+"</button></span>";
  }
  var zahl=liste.length+(liste.length!==S.state.students.length?" von "+S.state.students.length:"");
  box.innerHTML='<div class="stutab" role="table" aria-label="Klassenliste, '+zahl+' Personen">'+
    '<div class="stu-headrow" role="row"><span role="columnheader"><input type="checkbox" id="stuAll" aria-label="Alle sichtbaren auswählen"'+(alleGewaehlt?" checked":"")+'></span>'+
    '<span role="columnheader"><span class="sr-only">Details</span></span>'+kopf("vorname","Vorname")+kopf("nachname","Nachname")+
    kopf("geschlecht","Geschl.")+kopf("leistung","Leistung")+'<span role="columnheader">Besonderes</span>'+
    '<span role="columnheader">Regeln</span><span role="columnheader"><span class="sr-only">Entfernen</span></span></div></div>';
  var tab=box.firstChild;
  tab.querySelectorAll("[data-sort]").forEach(function(b){
    b.onclick=function(){
      if(S.stuSort===b.dataset.sort)S.stuSortAb=!S.stuSortAb;else{S.stuSort=b.dataset.sort;S.stuSortAb=false;}
      drawStuList();
      var z=document.querySelector('.thsort[data-sort="'+b.dataset.sort+'"]');if(z)z.focus();
    };
  });
  el("stuAll").onchange=function(){
    var an=this.checked;
    liste.forEach(function(s){if(an)S.stuAuswahl[s.id]=1;else delete S.stuAuswahl[s.id];});
    drawStuList();
  };
  if(!liste.length){
    var leer=document.createElement("p");leer.className="muted";leer.style.padding="14px";
    leer.textContent=S.stuSuche.trim()?"Kein Name passt zur Suche „"+S.stuSuche+"“"+(S.stuFilterG||S.stuFilterL?" und zu den Filtern.":"."):"Niemand passt zu den gewählten Filtern.";
    tab.appendChild(leer);stuDupAnzeigen();return;
  }
  var lehrerDa=hatLehrertisch();
  liste.forEach(function(s){
    var offen=!!S.stuOffen[s.id];
    var row=document.createElement("div");
    row.className="stu"+(offen?" offen":"")+(S.stuAuswahl[s.id]?" checked":"");
    row.dataset.sid=s.id;
    row.setAttribute("role","row");
    var flags="";
    if(s.solo)flags+='<span class="stu-flag" title="sitzt allein">'+ic("user")+"allein</span>";
    if(s.lehrer)flags+='<span class="stu-flag" title="nah am Lehrertisch, '+esc(lehrerText(s))+(lehrerDa?"":" – ruht, kein Lehrertisch im Raum")+'">'+ic("desk")+
      (lehrerStufe(s.lehrer)==="weich"?"Lehrertisch (weich)":"Lehrertisch")+"</span>";
    if(s.note)flags+='<span class="stu-flag" title="'+esc(s.note)+'">'+ic("msg")+"</span>";
    if(s.requiredTags.length)flags+='<span class="stu-flag" title="Platzwunsch: '+esc(s.requiredTags.map(function(t){var x=tagById(t);return x?x.name:"";}).join(", "))+'">'+ic("tag")+
      esc(s.requiredTags.map(function(t){var x=tagById(t);return x?x.name:"";}).filter(Boolean).join(", "))+"</span>";
    var rz=regelZahl[s.id],rules="";
    if(rz&&rz.bl)rules+='<span class="stu-flag" title="in '+rz.bl+" Auseinander-Gruppe(n)\">"+ic("split")+rz.bl+"</span>";
    if(rz&&rz.wl)rules+='<span class="stu-flag" title="in '+rz.wl+" Zusammen-Gruppe(n)\">"+ic("link")+rz.wl+"</span>";
    var top=document.createElement("div");
    top.className="stu-top";
    top.innerHTML='<input type="checkbox" class="stu-chk" aria-label="'+esc(s.name)+' auswählen"'+(S.stuAuswahl[s.id]?" checked":"")+">"+
      '<button type="button" class="stu-exp" aria-expanded="'+(offen?"true":"false")+'" aria-label="Details zu '+esc(s.name)+'">'+ic("chevR","sm")+"</button>"+
      '<input type="text" value="'+esc(s.vorname)+'" class="stu-name stu-vor" aria-label="Vorname" maxlength="60" placeholder="Vorname">'+
      '<input type="text" value="'+esc(s.nachname)+'" class="stu-name stu-nach" aria-label="Nachname von '+esc(s.vorname||s.name)+'" maxlength="60" placeholder="Nachname">'+
      '<select class="g" aria-label="Geschlecht von '+esc(s.name)+'">'+Object.keys(GENDERS).map(function(g){
        return '<option value="'+g+'"'+(s.gender===g?" selected":"")+">"+(g==="x"?"–":GENDERS[g].short)+"</option>";}).join("")+"</select>"+
      '<select class="l c-level" aria-label="Leistungsstärke von '+esc(s.name)+'"><option value="3"'+(s.level===3?" selected":"")+">stark</option>"+
      '<option value="2"'+(s.level===2?" selected":"")+">mittel</option>"+
      '<option value="1"'+(s.level===1?" selected":"")+">Unterstützung</option></select>"+
      '<span class="stu-flags">'+flags+"</span>"+
      '<span class="stu-rules">'+(rules||'<span style="color:var(--faint)">–</span>')+"</span>"+
      '<button type="button" class="ib" title="Entfernen" aria-label="'+esc(s.name)+' entfernen">'+ic("trash")+"</button>";
    top.querySelector(".stu-chk").onchange=function(){if(this.checked)S.stuAuswahl[s.id]=1;else delete S.stuAuswahl[s.id];drawStuList();};
    top.querySelector(".stu-exp").onclick=function(){
      if(S.stuOffen[s.id])delete S.stuOffen[s.id];else S.stuOffen[s.id]=1;
      drawStuList();
      var b=document.querySelector('.stu[data-sid="'+s.id+'"] .stu-exp');if(b)b.focus();
    };
    var fVor=top.querySelector(".stu-vor"),fNach=top.querySelector(".stu-nach");
    function nameAendern(){
      var vor=kurztext(fVor.value,60),nach=kurztext(fNach.value,60);
      fVor.classList.remove("fehler");fNach.classList.remove("fehler");
      if(vor===s.vorname&&nach===s.nachname){stuDupAnzeigen();return;}
      if(!vor&&!nach){toast("Ein Name darf nicht leer sein.","w");fVor.value=s.vorname;fNach.value=s.nachname;return;}
      var k=namensSchluessel(vor,nach);
      if(S.state.students.some(function(x){return x!==s&&personSchluessel(x)===k;})){
        /* nicht übernehmen, aber stehen lassen, damit direkt weiter unterschieden werden kann */
        fVor.classList.add("fehler");fNach.classList.add("fehler");
        fVor.setAttribute("aria-invalid","true");fNach.setAttribute("aria-invalid","true");
        toast("„"+vollName(vor,nach)+"“ gibt es schon. Bitte den Nachnamen oder einen Anfangsbuchstaben ergänzen, damit jede Person eindeutig ist.","w");
        return;
      }
      schritt("Name geändert");
      s.vorname=vor;s.nachname=nach;s.name=vollName(vor,nach);
      reindex();stuDupAnzeigen();klassenZaehler();
      ansage("Name geändert: "+s.name+".");
    }
    fVor.onchange=nameAendern;fNach.onchange=nameAendern;
    top.querySelector(".g").onchange=function(){schritt("Geschlecht geändert");s.gender=this.value;};
    top.querySelector(".l").onchange=function(){schritt("Leistung geändert");s.level=parseInt(this.value,10);};
    top.querySelector(".ib").onclick=function(){
      confirmBox("„"+s.name+"“ entfernen? Auch Regeln mit dieser Person werden entfernt.",function(){
        schritt(s.name+" entfernt");stuLoeschen([s.id]);drawStuList();
      },null,{ja:"Entfernen",gefahr:true});
    };
    row.appendChild(top);

    if(offen){
      var det=document.createElement("div");
      det.className="stu-det";
      var nid="note_"+s.id.replace(/[^A-Za-z0-9_-]/g,"");
      det.innerHTML='<div><label class="lbl" for="'+nid+'">Hinweis <span style="font-weight:400">(nur in der Lehrersicht, wenn eingeschaltet)</span></label>'+
        '<input type="text" id="'+nid+'" placeholder="z. B. Brille, braucht Platz vorn" maxlength="300"></div>'+
        '<div><span class="lbl">Sitzen</span><div class="tgl" data-solo></div></div>'+
        '<div><span class="lbl" id="nl_'+nid+'">Nah am Lehrertisch</span>'+
          '<div class="seg sm" role="group" aria-labelledby="nl_'+nid+'" data-lehrerwahl>'+
          [["","nicht nötig"],["standard","Standard · bis "+LEHRER_STUFEN.standard.radius+" Felder"],["weich","weich · bis "+LEHRER_STUFEN.weich.radius+" Felder"]].map(function(o){
            var an=(lehrerStufe(s.lehrer)||"")===o[0];
            return '<button type="button" data-lehrer="'+o[0]+'" aria-pressed="'+(an?"true":"false")+'">'+(o[0]?ic("desk","sm"):"")+o[1]+"</button>";
          }).join("")+"</div>"+
          '<p class="hint" style="margin:6px 0 0">'+(s.lehrer&&!lehrerDa?"Ruht, solange im Raum kein Lehrertisch steht.":
            "Abstand vom Lehrertisch in Feldern, in jede Richtung – je näher, desto besser.")+"</p></div>"+
        '<div><span class="lbl">Platzwunsch</span><div class="tgl" data-wunsch></div></div>';
      var nz=det.querySelector("input");
      nz.value=s.note||"";
      nz.onchange=function(){var v=kurztext(this.value,300);if(v!==s.note){schritt("Hinweis geändert");s.note=v;}};
      var solo=document.createElement("button");
      solo.type="button";
      solo.className="tg"+(s.solo?" on":"");
      solo.innerHTML=ic("user","sm")+"sitzt allein";
      if(s.solo)solo.style.background="var(--warn)";
      solo.setAttribute("aria-pressed",s.solo?"true":"false");
      solo.onclick=function(){
        schritt(s.solo?"Einzelplatz aufgehoben":"Einzelplatz gesetzt");
        s.solo=!s.solo;
        if(s.solo&&S.state.whitelist.some(function(g){return g.members.indexOf(s.id)!==-1;}))
          toast(s.name+" ist in einer Zusammen-Gruppe – beides zugleich geht nicht.","w");
        drawStuList();
        var z=document.querySelector('.stu[data-sid="'+s.id+'"] [data-solo] .tg');if(z)z.focus();
      };
      det.querySelector("[data-solo]").appendChild(solo);
      det.querySelectorAll("[data-lehrer]").forEach(function(b){
        b.onclick=function(){
          var neu=b.dataset.lehrer||false;
          if((lehrerStufe(s.lehrer)||"")===(neu||""))return;
          schritt(neu?"Nah am Lehrertisch: "+LEHRER_STUFEN[neu].name:"Nah am Lehrertisch aufgehoben");
          s.lehrer=neu;
          if(neu&&!hatLehrertisch())toast("Im Raum steht noch kein Lehrertisch – die Regel ruht, bis einer aufgestellt ist.","w");
          drawStuList();
          var z=document.querySelector('.stu[data-sid="'+s.id+'"] [data-lehrer="'+(neu||"")+'"]');if(z)z.focus();
        };
      });
      var tw=det.querySelector("[data-wunsch]");
      if(!S.state.tags.length){
        tw.outerHTML='<p class="muted" style="margin:0">Noch keine Platzmerkmale. Lege sie unter „Platzmerkmale“ an oder direkt im Raum.</p>';
      }else S.state.tags.forEach(function(t){
        var on=s.requiredTags.indexOf(t.id)!==-1;
        var btn=document.createElement("button");
        btn.type="button";
        btn.className="tg"+(on?" on":"");
        btn.innerHTML=(on?ic("check","sm"):'<span class="tagdot" style="background:'+t.color+'"></span>')+esc(t.name);
        if(on)btn.style.background=t.color;
        btn.setAttribute("aria-pressed",on?"true":"false");
        btn.onclick=function(){
          var i=s.requiredTags.indexOf(t.id);
          schritt(i===-1?"Platzwunsch gesetzt":"Platzwunsch entfernt");
          if(i===-1)s.requiredTags.push(t.id);else s.requiredTags.splice(i,1);
          drawStuList();
        };
        tw.appendChild(btn);
      });
      row.appendChild(det);
    }
    tab.appendChild(row);
  });
  stuDupAnzeigen();
}
