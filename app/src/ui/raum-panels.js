import { el, esc, uid } from "../core/basis.js";
import { allSeats, meta, seatKey, tableCells, tischName, usableSeats } from "../core/geometrie.js";
import { tagById } from "../core/regeln.js";
import { kurztext } from "../core/schema.js";
import { save, schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { toast } from "./meldungen.js";
import { closeModal, openModal } from "./modal.js";
import { boxCells, collides, fits, fitsBox, furniture, overlaps } from "./plan-ansicht.js";
import { drawEditor, drawTemplates, lehrertischGeaendert, miniatur, moebelLoeschen, multiAn, rasterAendern, removeTable, sitzpunktFokus, tischDrehen } from "./raum-editor.js";
import { ic } from "./symbole.js";

/* ---- Schnell-Layout: eigener Dialog mit Vorschau ---- */
function schnellGeometrie(n,per,rows){
  var gapX=1,startY=2,gapY=2;
  var totalW=per*n+(per-1)*gapX;
  var cols=Math.max(S.state.room.cols,Math.min(24,totalW));
  var rr=Math.max(S.state.room.rows,Math.min(20,startY+rows*gapY));
  var startX=Math.max(0,Math.floor((cols-totalW)/2));
  var belegt={};
  furniture().forEach(function(f){boxCells("furniture",f,f.x,f.y).forEach(function(c){belegt[c.x+","+c.y]=1;});});
  var tische=[];
  for(var r=0;r<rows;r++)for(var c=0;c<per;c++){
    var t={x:startX+c*(n+gapX),y:startY+r*gapY,seats:n,dir:"h"};
    var zellen=tableCells(t);
    if(zellen.every(function(z){return z.x>=0&&z.y>=0&&z.x<cols&&z.y<rr&&!belegt[z.x+","+z.y];})){
      zellen.forEach(function(z){belegt[z.x+","+z.y]=1;});
      tische.push(t);
    }
  }
  return{cols:cols,rows:rr,tables:tische,soll:per*rows};
}
function quickLayout(n,per,rows){
  var g=schnellGeometrie(n,per,rows);
  schritt("Schnell-Layout");
  S.state.room.cols=g.cols;S.state.room.rows=g.rows;
  S.state.tables=g.tables.map(function(t){return{id:uid("t"),x:t.x,y:t.y,seats:t.seats,dir:"h"};});
  S.state.seatMeta={};S.state.arrangement={};S.edSel=null;S.seatMenu={tid:null,idx:null};
  drawEditor();
  toast(g.tables.length+" Tische mit "+(g.tables.length*n)+" Plätzen angelegt.");
  if(g.tables.length<g.soll)toast("Nicht alle Tische passten ins Raster.","w");
}
export function schnellLayoutDialog(){
  openModal(function(b){
    b.innerHTML="<h3>Schnell-Layout</h3>"+
      '<p class="hint">Füllt den Raum in einem Schritt mit gleich großen Tischen. Tafel und Lehrertisch bleiben stehen; die vorhandenen Tische, ihre Platzmerkmale und die Sitzordnung werden ersetzt.</p>'+
      '<div class="rowf" style="align-items:flex-end;gap:12px">'+
        '<label class="field">Tischgröße<select id="qlSize"><option value="1">Einzeltische</option><option value="2" selected>2er-Tische</option><option value="3">3er-Tische</option><option value="4">4er-Tische</option></select></label>'+
        '<label class="field">Tische pro Reihe<input type="number" id="qlPerRow" value="3" min="1" max="8" style="width:120px"></label>'+
        '<label class="field">Reihen<input type="number" id="qlRows" value="4" min="1" max="8" style="width:120px"></label>'+
      "</div>"+
      '<div class="qlprev" id="qlPrev"></div><p class="muted" id="qlInfo" style="margin:0"></p>'+
      '<div class="modal-actions"><button type="button" id="qlAbbr" class="btn">Abbrechen</button>'+
      '<button type="button" id="qlGo" class="btn primary">Tische ersetzen</button></div>';
    function werte(){
      return[parseInt(el("qlSize").value,10),
        Math.max(1,Math.min(8,parseInt(el("qlPerRow").value,10)||1)),
        Math.max(1,Math.min(8,parseInt(el("qlRows").value,10)||1))];
    }
    function vorschau(){
      var w=werte(),g=schnellGeometrie(w[0],w[1],w[2]);
      var svg=miniatur({cols:g.cols,rows:g.rows,tables:g.tables,furniture:furniture()});
      el("qlPrev").innerHTML=svg.replace('viewBox="0 0 78 56"','viewBox="0 0 78 56" width="320" height="230"');
      el("qlInfo").textContent=g.tables.length+" Tische · "+(g.tables.length*w[0])+" Plätze · Raster "+g.cols+" × "+g.rows+
        (g.tables.length<g.soll?" · "+(g.soll-g.tables.length)+" Tische passen nicht":"");
    }
    ["qlSize","qlPerRow","qlRows"].forEach(function(id){el(id).oninput=vorschau;el(id).onchange=vorschau;});
    el("qlAbbr").onclick=closeModal;
    el("qlGo").onclick=function(){var w=werte();closeModal();quickLayout(w[0],w[1],w[2]);};
    vorschau();
  });
}

/* ---- Platz im Raum bearbeiten: im Eigenschaften-Bereich statt als Einblendung ---- */
S.seatMenu={tid:null,idx:null};
export function openSeatMenu(tid,idx){
  if(multiAn())S.multiSel=null;
  S.seatMenu={tid:tid,idx:idx};S.edSel=tid;
  drawEditor();
  setTimeout(function(){var f=document.querySelector("#popTags .tg")||el("popNew");if(f)f.focus({preventScroll:true});},40);
}
export function closeSeatMenu(){
  var war=S.seatMenu.tid!==null;
  S.seatMenu={tid:null,idx:null};
  if(war)drawTablePanel();
}
function panelKopf(kicker,titel,sub){
  return '<div class="insp-kicker">'+kicker+'</div><div class="insp-title">'+titel+"</div>"+(sub?'<div class="insp-sub">'+sub+"</div>":"");
}
export function drawTablePanel(){
  var p=el("edTablePanel");if(!p)return;
  var mb=el("edMulti");
  if(mb){mb.setAttribute("aria-pressed",multiAn()?"true":"false");mb.querySelector("span").textContent=multiAn()?"Mehrfachauswahl beenden":"Mehrfachauswahl";}
  if(multiAn()){drawMultiPanel(p);return;}
  if(S.seatMenu.tid!==null&&S.state.tables.some(function(t){return t.id===S.seatMenu.tid;})){drawSeatPanel(p);return;}
  S.seatMenu={tid:null,idx:null};
  var f=furniture().filter(function(x){return x.id===S.edSel;})[0];
  if(f){drawFurniturePanel(p,f);return;}
  var t=S.state.tables.filter(function(x){return x.id===S.edSel;})[0];
  if(!t){drawRaumPanel(p);return;}
  var nr=S.state.tables.indexOf(t)+1;
  var h=panelKopf("Ausgewählter Tisch",tischName(t),"Tisch "+nr+" · "+(t.dir==="h"?"quer":"längs")+(t.winkel?" · um "+t.winkel+"° gedreht":"")+" · Spalte "+(t.x+1)+", Reihe "+(t.y+1));
  h+='<div class="rowf" style="margin-top:14px"><button type="button" class="btn" id="tRot">'+ic("rotate")+"Um 90° drehen</button>"+
    '<button type="button" class="btn danger" id="tDel">'+ic("trash")+"Löschen</button></div>";
  h+='<div class="insp-sec" style="margin-top:16px"><div class="insp-h">Drehung</div>'+
    '<div class="rowf drehreihe"><button type="button" class="btn icon" id="tWm" aria-label="5 Grad gegen den Uhrzeigersinn drehen" title="−5° (Q)">'+ic("rotL")+"</button>"+
    '<input type="number" id="tW" min="-180" max="360" step="5" value="'+(t.winkel||0)+'" aria-label="Drehwinkel in Grad" style="width:84px">'+
    '<span class="muted" aria-hidden="true">°</span>'+
    '<button type="button" class="btn icon" id="tWp" aria-label="5 Grad im Uhrzeigersinn drehen" title="+5° (E)">'+ic("rotate")+"</button>"+
    '<button type="button" class="btn sm ghost" id="tW0"'+(t.winkel?"":" disabled")+">gerade stellen</button></div>"+
    '<p class="hint" style="margin:8px 0 0">In 5°-Schritten – auch mit Umschalt + Mausrad über dem Tisch oder mit den Tasten Q und E. Bei 90°, 180° und 270° rastet der Tisch wieder genau im Raster ein.</p></div>';
  h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Plätze</div><div class="seatlist">';
  for(var i=0;i<t.seats;i++){
    var m=meta(seatKey(t.id,i));
    var tn=(m.tags||[]).map(function(id){var x=tagById(id);return x?x.name:"";}).filter(Boolean).join(", ");
    h+='<button type="button" data-seat="'+i+'"><span class="no">'+(i+1)+'</span><span><strong>Platz '+(i+1)+'</strong><br><span class="info">'+
      (m.blocked?"gesperrt":(tn?esc(tn):"keine Merkmale"))+"</span></span>"+ic("chevR","sm chev")+"</button>";
  }
  h+="</div></div>";
  h+='<p class="hint" style="margin-top:14px">Verschieben: am Rand ziehen oder mit den Pfeiltasten. R dreht um 90°, Q und E um 5°, Entf löscht.</p>';
  p.innerHTML=h;
  function drehKnopf(id,fn){el(id).onclick=function(){fn();setTimeout(function(){var b=el(id);if(b&&!b.disabled)b.focus();else if(el("tW"))el("tW").focus();},0);};}
  drehKnopf("tWm",function(){tischDrehen(t,-5,false,true);});
  drehKnopf("tWp",function(){tischDrehen(t,5,false,true);});
  drehKnopf("tW0",function(){tischDrehen(t,0,true,true);});
  el("tW").onchange=function(){
    var v=parseInt(this.value,10);
    if(isNaN(v)||!tischDrehen(t,v,true,true))this.value=t.winkel||0;
    setTimeout(function(){if(el("tW"))el("tW").focus();},0);
  };
  el("tRot").onclick=function(){
    var old=t.dir;t.dir=old==="h"?"v":"h";
    if(!fits(t,t.x,t.y)||overlaps(t,t.x,t.y)){t.dir=old;toast("Zum Drehen ist kein Platz frei.","w");return;}
    t.dir=old;schritt("Tisch gedreht");t.dir=old==="h"?"v":"h";
    drawEditor();
  };
  el("tDel").onclick=function(){schritt("Tisch gelöscht");removeTable(t.id);drawEditor();toast("Tisch gelöscht – mit Rückgängig zurückholen.");};
  p.querySelectorAll("[data-seat]").forEach(function(b){b.onclick=function(){openSeatMenu(t.id,parseInt(b.dataset.seat,10));};});
}
function drawRaumPanel(p){
  var plaetze=allSeats().length,frei=usableSeats().length;
  var h=panelKopf("Raum",esc(plaetze+" Plätze"),S.state.tables.length+" Tische"+(plaetze!==frei?" · "+(plaetze-frei)+" gesperrt":""));
  h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Rastergröße</div>'+
    '<div class="rowf"><input type="number" id="edCols" min="4" max="24" value="'+S.state.room.cols+'" style="width:78px" aria-label="Spalten">'+
    '<span class="muted">×</span><input type="number" id="edRows" min="3" max="20" value="'+S.state.room.rows+'" style="width:78px" aria-label="Reihen">'+
    '<button type="button" class="btn" id="edSize">Übernehmen</button></div>'+
    '<p class="hint" style="margin-top:8px">Breite × Tiefe in Feldern. Oben ist die Vorderseite des Raums. Zoom ändert nur die Anzeige.</p></div>';
  h+='<div class="insp-sec" style="margin-top:14px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Vorlagen</div><div class="tplgrid" id="tplBox"></div></div>';
  h+='<div class="insp-sec" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">So geht’s</div>'+
    '<p class="muted" style="margin:0">Tippe einen Tisch, die Tafel oder einen Platz an, um ihn hier zu bearbeiten. Tische am Rand greifen und ziehen.</p></div>';
  p.innerHTML=h;
  el("edSize").onclick=rasterAendern;
  ["edCols","edRows"].forEach(function(id){el(id).addEventListener("keydown",function(e){if(e.key==="Enter")rasterAendern();});});
  drawTemplates();
}
function drawSeatPanel(p){
  var tid=S.seatMenu.tid,idx=S.seatMenu.idx,k=seatKey(tid,idx),m=meta(k);
  var t=S.state.tables.filter(function(x){return x.id===tid;})[0],nr=S.state.tables.indexOf(t)+1;
  var h=panelKopf("Ausgewählter Platz","Platz "+(idx+1),"Tisch "+nr+" · "+tischName(t)+(m.blocked?" · gesperrt":""));
  h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Platzmerkmale</div>';
  h+=S.state.tags.length?'<div class="tgl" id="popTags"></div>':'<p class="muted" style="margin:0 0 8px">Noch keine Merkmale angelegt.</p>';
  h+='<div class="rowf" style="margin-top:10px"><input type="text" id="popNew" placeholder="Neues Merkmal, z. B. vorne" aria-label="Neues Platzmerkmal" style="flex:1;min-width:120px">'+
    '<input type="color" id="popColor" value="#326b7a" aria-label="Farbe des Merkmals">'+
    '<button type="button" id="popAdd" class="btn primary icon" aria-label="Merkmal anlegen und zuweisen">'+ic("plus")+"</button></div></div>";
  h+='<div class="insp-sec" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Nutzung</div>'+
    '<button type="button" id="popBlock" class="btn'+(m.blocked?"":" danger")+'" style="width:100%;justify-content:flex-start">'+ic(m.blocked?"check":"ban")+
    (m.blocked?"Platz wieder freigeben":"Platz sperren (bleibt leer)")+"</button>"+
    '<p class="hint" style="margin-top:8px">Gesperrte Plätze werden beim Anordnen übersprungen und im Ausdruck leer gelassen.</p></div>';
  h+='<div class="insp-actions"><button type="button" class="btn ghost" id="popX">'+ic("chevL")+"Zurück zum Tisch</button></div>";
  p.innerHTML=h;
  el("popX").onclick=function(){var d=S.seatMenu;S.seatMenu={tid:null,idx:null};drawEditor();sitzpunktFokus(d);};
  if(S.state.tags.length){
    var wrap=el("popTags");
    S.state.tags.forEach(function(tg,ti){
      var on=m.tags.indexOf(tg.id)!==-1;
      var btn=document.createElement("button");
      btn.type="button";
      btn.className="tg"+(on?" on":"");
      btn.innerHTML=(on?ic("check","sm"):'<span class="tagdot" style="background:'+tg.color+'"></span>')+esc(tg.name);
      if(on)btn.style.background=tg.color;
      btn.setAttribute("aria-pressed",on?"true":"false");
      btn.onclick=function(){
        var i=m.tags.indexOf(tg.id);
        schritt(i===-1?"Platzmerkmal zugewiesen":"Platzmerkmal entfernt");
        if(i===-1)m.tags.push(tg.id);else m.tags.splice(i,1);
        save();drawEditor();
        var z=document.querySelectorAll("#popTags .tg")[ti];if(z)z.focus();
      };
      wrap.appendChild(btn);
    });
  }
  function addTag(){
    var n=kurztext(el("popNew").value,40);
    if(!n){toast("Bitte einen Namen für das Merkmal eingeben.","w");return;}
    var tg={id:uid("tag"),name:n,color:el("popColor").value};
    schritt("Platzmerkmal angelegt");
    S.state.tags.push(tg);m.tags.push(tg.id);
    save();drawEditor();
    toast("Merkmal „"+n+"“ angelegt und zugewiesen.");
  }
  el("popAdd").onclick=addTag;
  el("popNew").addEventListener("keydown",function(e){if(e.key==="Enter")addTag();});
  el("popBlock").onclick=function(){
    schritt(m.blocked?"Platz freigegeben":"Platz gesperrt");
    m.blocked=!m.blocked;
    if(m.blocked)delete S.state.arrangement[k];
    save();drawEditor();
  };
}
function drawMultiPanel(p){
  var keys=Object.keys(S.multiSel);
  var h=panelKopf("Mehrfachauswahl",keys.length+(keys.length===1?" Platz":" Plätze")+" ausgewählt","Plätze im Raster antippen, um sie aus- oder abzuwählen.");
  h+='<div class="rowf" style="margin-top:14px"><button type="button" class="btn sm" id="msAll">Alle Plätze</button>'+
     '<button type="button" class="btn sm ghost" id="msNone">Auswahl leeren</button></div>';
  if(keys.length){
    h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Merkmal allen zuweisen oder entfernen</div>';
    h+=S.state.tags.length?'<div class="tgl" id="msTags"></div>':'<p class="muted" style="margin:0 0 8px">Noch keine Merkmale angelegt.</p>';
    h+='<div class="rowf" style="margin-top:10px"><input type="text" id="msNew" placeholder="Neues Merkmal" aria-label="Neues Platzmerkmal" style="flex:1;min-width:110px">'+
       '<input type="color" id="msColor" value="#326b7a" aria-label="Farbe des Merkmals">'+
       '<button type="button" id="msAdd" class="btn primary icon" aria-label="Merkmal anlegen und zuweisen">'+ic("plus")+"</button></div></div>";
    h+='<div class="insp-sec" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Nutzung</div><div class="rowf">'+
       '<button type="button" class="btn danger" id="msBlock">'+ic("ban")+"Alle sperren</button>"+
       '<button type="button" class="btn" id="msFree">'+ic("check")+"Alle freigeben</button></div></div>";
  }
  h+='<div class="insp-actions"><button type="button" class="btn ghost" id="msEnd">'+ic("x")+"Mehrfachauswahl beenden</button></div>";
  p.innerHTML=h;
  el("msEnd").onclick=function(){S.multiSel=null;S.edSel=null;S.seatMenu={tid:null,idx:null};drawEditor();};
  el("msAll").onclick=function(){
    S.multiSel={};allSeats().forEach(function(s){S.multiSel[s.key]=1;});
    drawEditor();
  };
  el("msNone").onclick=function(){S.multiSel={};drawEditor();};
  if(!keys.length)return;
  var wrap=el("msTags");
  if(wrap)S.state.tags.forEach(function(t){
    var alle=keys.every(function(k){return meta(k).tags.indexOf(t.id)!==-1;});
    var btn=document.createElement("button");
    btn.type="button";
    btn.className="tg"+(alle?" on":"");
    btn.innerHTML=(alle?ic("check","sm"):'<span class="tagdot" style="background:'+t.color+'"></span>')+esc(t.name);
    if(alle)btn.style.background=t.color;
    btn.title=alle?"bei allen entfernen":"allen zuweisen";
    btn.setAttribute("aria-pressed",alle?"true":"false");
    btn.onclick=function(){
      schritt(alle?"Merkmal bei mehreren Plätzen entfernt":"Merkmal mehreren Plätzen zugewiesen");
      keys.forEach(function(k){
        var m=meta(k),i=m.tags.indexOf(t.id);
        if(alle){if(i!==-1)m.tags.splice(i,1);}
        else if(i===-1)m.tags.push(t.id);
      });
      save();drawEditor();
      toast(alle?("Merkmal „"+t.name+"“ bei "+keys.length+" Plätzen entfernt.")
                :("Merkmal „"+t.name+"“ "+keys.length+" Plätzen zugewiesen."));
    };
    wrap.appendChild(btn);
  });
  function neu(){
    var n=kurztext(el("msNew").value,40);
    if(!n){toast("Bitte einen Namen für das Merkmal eingeben.","w");return;}
    var t={id:uid("tag"),name:n,color:el("msColor").value};
    schritt("Platzmerkmal angelegt");
    S.state.tags.push(t);
    keys.forEach(function(k){meta(k).tags.push(t.id);});
    save();drawEditor();
    toast("Merkmal „"+n+"“ angelegt und "+keys.length+" Plätzen zugewiesen.");
  }
  el("msAdd").onclick=neu;
  el("msNew").addEventListener("keydown",function(e){if(e.key==="Enter")neu();});
  el("msBlock").onclick=function(){
    schritt("Plätze gesperrt");
    keys.forEach(function(k){meta(k).blocked=true;delete S.state.arrangement[k];});
    save();drawEditor();toast(keys.length+" Plätze gesperrt.");
  };
  el("msFree").onclick=function(){
    schritt("Plätze freigegeben");
    keys.forEach(function(k){meta(k).blocked=false;});
    save();drawEditor();toast(keys.length+" Plätze freigegeben.");
  };
}
function drawFurniturePanel(p,f){
  var h=panelKopf("Ausgewähltes Möbelstück",esc(f.label||(f.type==="board"?"Tafel":"Lehrertisch")),
    (f.type==="board"?"Tafel":"Möbel")+" · Spalte "+(f.x+1)+", Reihe "+(f.y+1));
  h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">'+
    '<label class="insp-h" for="fLabel" style="display:block">Beschriftung</label>'+
    '<input type="text" id="fLabel" value="'+esc(f.label)+'" style="width:100%" placeholder="z. B. Smartboard, Waschbecken">'+
    '<div class="insp-h" style="margin-top:16px">Breite</div>'+
    '<div class="rowf"><button type="button" id="fMinus" class="btn icon" aria-label="Schmaler">'+ic("minus")+"</button>"+
    '<span style="min-width:90px;text-align:center"><strong id="fW">'+f.w+"</strong> Felder</span>"+
    '<button type="button" id="fPlus" class="btn icon" aria-label="Breiter">'+ic("plus")+"</button></div></div>";
  h+='<div class="insp-actions"><button type="button" id="fDel" class="btn danger">'+ic("trash")+"Löschen</button></div>";
  p.innerHTML=h;
  el("fLabel").oninput=function(){
    f.label=kurztext(this.value,60);
    var n=document.querySelector('[data-fid="'+f.id+'"] span');
    if(n)n.textContent=f.label||" ";
    save();
  };
  el("fLabel").onchange=function(){if(!f.label){f.label=f.type==="board"?"Tafel":"Lehrertisch";}drawEditor();};
  el("fPlus").onclick=function(){
    var o=f.w;f.w++;
    if(!fitsBox("furniture",f,f.x,f.y)||collides("furniture",f,f.x,f.y)){f.w=o;toast("Kein Platz zum Verbreitern.","w");return;}
    f.w=o;schritt("Breite geändert");f.w++;
    drawEditor();
    if(f.type==="desk")lehrertischGeaendert();
  };
  el("fMinus").onclick=function(){
    if(f.w<=1)return;schritt("Breite geändert");f.w--;drawEditor();
    if(f.type==="desk")lehrertischGeaendert();
  };
  el("fDel").onclick=function(){moebelLoeschen(f);};
}
