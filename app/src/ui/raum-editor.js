import { el, esc, uid } from "../core/basis.js";
import { buildAdj, meta, plaetzeUmkehren, seatKey, tischName, tischZellen, usableSeats, viertelLagen, winkelNorm } from "../core/geometrie.js";
import { hatLehrertisch, lehrerRegelAnzahl, tagById } from "../core/regeln.js";
import { kurztext } from "../core/schema.js";
import { evaluate } from "../core/solver.js";
import { vorlageA, vorlageB, vorlageC } from "../core/vorlagen.js";
import { reindex } from "../core/zustand.js";
import { Store, pruefeBald, save, schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { ansage, toast } from "./meldungen.js";
import { closeModal, openModal } from "./modal.js";
import { boxCells, collides, fits, fitsBox, furniture, overlaps } from "./plan-ansicht.js";
import { renderAll } from "./plan-status.js";
import { drawTablePanel, openSeatMenu, schnellLayoutDialog } from "./raum-panels.js";
import { ic } from "./symbole.js";
import { groessenBeobachter, pinchAnbinden, zoomAnzeige, zoomSetzen, zoomStufe, zoomWert } from "./zoom.js";

/* ===================== Raumeditor ===================== */
S.edSel=null;
S.EDCELL=42;
S.multiSel=null;                         /* null = aus, sonst Objekt mit ausgewählten Plätzen */
export function multiAn(){return S.multiSel!==null;}
function multiZahl(){return S.multiSel?Object.keys(S.multiSel).length:0;}
export function renderRoomTab(){buildRoomEditor(el("roomPane"));}
function buildRoomEditor(b){
  b.innerHTML=
    '<main class="canvas-col">'+
      '<div class="edtoolbar" role="toolbar" aria-label="Raum-Werkzeuge">'+
        '<div class="tgroup" role="group" aria-label="Tisch hinzufügen"><span class="tlabel">Tisch</span>'+
          '<button type="button" class="btn" data-add="1" aria-label="Einzeltisch hinzufügen">'+ic("plus")+"Einzel</button>"+
          '<button type="button" class="btn" data-add="2" aria-label="2er-Tisch hinzufügen">'+ic("plus")+"2er</button>"+
          '<button type="button" class="btn" data-add="3" aria-label="3er-Tisch hinzufügen">'+ic("plus")+"3er</button>"+
          '<button type="button" class="btn" data-add="4" aria-label="4er-Tisch hinzufügen">'+ic("plus")+"4er</button></div>"+
        '<div class="tgroup" role="group" aria-label="Möbel hinzufügen">'+
          '<button type="button" class="btn" data-furn="board">'+ic("board")+"Tafel</button>"+
          '<button type="button" class="btn" data-furn="desk">'+ic("desk")+"Lehrertisch</button></div>"+
        '<span class="spacer"></span>'+
        '<div class="tgroup">'+
          '<button type="button" class="btn" id="edMulti" aria-pressed="false">'+ic("select")+"<span>Mehrfachauswahl</span></button>"+
          '<button type="button" class="btn" id="edQuick">'+ic("grid")+"<span>Schnell-Layout …</span></button></div>"+
      "</div>"+
      '<div class="stage ed-stage" id="edStage"><div class="edframe" id="edFrame">'+
        '<div id="edCanvas" class="ed-canvas" role="group" aria-label="Raumraster – Vorderseite oben"></div>'+
        '<div class="edgrip gl" role="group" aria-label="Linke Seite des Raums">'+
          griff("l+","arrL","Links eine Spalte anfügen","add")+griff("l-","arrR","Links eine Spalte wegnehmen","")+"</div>"+
        '<div class="edgrip gr" role="group" aria-label="Rechte Seite des Raums">'+
          griff("r+","arrR","Rechts eine Spalte anfügen","add")+griff("r-","arrL","Rechts eine Spalte wegnehmen","")+"</div>"+
        '<div class="edgrip gb" role="group" aria-label="Hintere Seite des Raums">'+
          griff("b-","arrU","Hinten eine Reihe wegnehmen","")+griff("b+","arrD","Hinten eine Reihe anfügen","add")+"</div>"+
      "</div></div>"+
      '<div class="planbar">'+
        '<span class="muted lbl">Tische am Rand ziehen · Platz antippen für Merkmale · Pfeiltasten verschieben · R, Q, E oder Umschalt + Mausrad drehen</span>'+
        '<span class="spacer"></span>'+
        '<div class="zoom" role="group" aria-label="Zoom">'+
          '<button id="edZOut" class="btn icon ghost" type="button" aria-label="Verkleinern" title="Verkleinern">'+ic("minus")+"</button>"+
          '<button id="edZFit" class="btn ghost zval" type="button" title="An Fenster anpassen" aria-label="Zoom zurücksetzen">100 %</button>'+
          '<button id="edZIn" class="btn icon ghost" type="button" aria-label="Vergrößern" title="Vergrößern">'+ic("plus")+"</button>"+
        "</div>"+
      "</div>"+
    "</main>"+
    '<aside class="inspector" id="edInspector" aria-label="Eigenschaften"><div id="edTablePanel"></div></aside>';

  b.querySelectorAll("[data-add]").forEach(function(btn){
    btn.onclick=function(){addTable(parseInt(btn.dataset.add,10));};
  });
  b.querySelectorAll("[data-furn]").forEach(function(btn){
    btn.onclick=function(){addFurniture(btn.dataset.furn);};
  });
  el("edMulti").onclick=function(){
    S.multiSel=multiAn()?null:{};
    S.edSel=null;S.seatMenu={tid:null,idx:null};drawEditor();
    ansage(multiAn()?"Mehrfachauswahl an. Plätze antippen, um sie auszuwählen.":"Mehrfachauswahl beendet.");
  };
  el("edQuick").onclick=schnellLayoutDialog;
  b.querySelectorAll("[data-grow]").forEach(function(g){g.onclick=function(){raumWachsen(g.dataset.grow,g);};});
  /* Tippen auf eine leere Stelle hebt die Auswahl von Tisch, Möbel oder Platz auf */
  el("edStage").addEventListener("click",function(e){
    if(multiAn())return;
    if(e.target.closest&&e.target.closest(".et,.ed-board,.ed-desk,.edgrip"))return;
    if(S.edSel===null&&S.seatMenu.tid===null)return;
    S.edSel=null;S.seatMenu={tid:null,idx:null};drawEditor();
  });
  el("edZOut").onclick=function(){zoomStufe("raum",-1);};
  el("edZIn").onclick=function(){zoomStufe("raum",1);};
  el("edZFit").onclick=function(){zoomSetzen("raum",1);};
  pinchAnbinden(el("edStage"),"raum");
  if(groessenBeobachter)groessenBeobachter.observe(el("edStage"),{box:"border-box"});
  zoomAnzeige();
  drawEditor();
}
function griff(was,icon,label,kl){
  return '<button type="button" class="'+kl+'" data-grow="'+was+'" title="'+label+'" aria-label="'+label+'">'+ic(icon)+"</button>";
}
/* Raum an den Seiten vergrößern oder verkleinern (vorn an der Tafel nicht nötig) */
function raumWachsen(was,knopf){
  var c=S.state.room.cols,r=S.state.room.rows;
  function belegt(pruef){
    return S.state.tables.some(function(t){return tischZellen(t).some(pruef);})||
      furniture().some(function(f){return boxCells("furniture",f,f.x,f.y).some(pruef);});
  }
  function verschieben(dx){
    S.state.tables.forEach(function(t){t.x+=dx;});
    furniture().forEach(function(f){f.x+=dx;});
  }
  if(was.charAt(1)==="+"){
    if((was==="b+"&&r>=20)||(was!=="b+"&&c>=24)){toast(was==="b+"?"Mehr als 20 Reihen gehen nicht.":"Mehr als 24 Spalten gehen nicht.","w");return;}
    schritt(was==="b+"?"Reihe angefügt":"Spalte angefügt");
    if(was==="b+")S.state.room.rows++;
    else{S.state.room.cols++;if(was==="l+")verschieben(1);}
  }else{
    if(was==="b-"){
      if(r<=3){toast("Weniger als 3 Reihen gehen nicht.","w");return;}
      if(belegt(function(z){return z.y===r-1;})){toast("In der hintersten Reihe steht noch etwas – erst verschieben oder löschen.","w");return;}
      schritt("Reihe weggenommen");S.state.room.rows--;
    }else{
      if(c<=4){toast("Weniger als 4 Spalten gehen nicht.","w");return;}
      var x=was==="l-"?0:c-1;
      if(belegt(function(z){return z.x===x;})){toast("In der "+(was==="l-"?"linken":"rechten")+" Spalte steht noch etwas – erst verschieben oder löschen.","w");return;}
      schritt("Spalte weggenommen");S.state.room.cols--;
      if(was==="l-")verschieben(-1);
    }
  }
  drawEditor();
  ansage("Raum jetzt "+S.state.room.cols+" Spalten breit und "+S.state.room.rows+" Reihen tief.");
  if(knopf)setTimeout(function(){knopf.focus();},0);
}
export function rasterAendern(){
  var nc=Math.max(4,Math.min(24,parseInt(el("edCols").value,10)||S.state.room.cols));
  var nr=Math.max(3,Math.min(20,parseInt(el("edRows").value,10)||S.state.room.rows));
  var oc=S.state.room.cols,or_=S.state.room.rows;
  if(nc===oc&&nr===or_){el("edCols").value=nc;el("edRows").value=nr;return;}
  S.state.room.cols=nc;S.state.room.rows=nr;
  var dropped=S.state.tables.filter(function(t){return !fits(t,t.x,t.y);});
  var mDrop=furniture().filter(function(f){return !fitsBox("furniture",f,f.x,f.y);});
  S.state.room.cols=oc;S.state.room.rows=or_;
  function los(){
    schritt("Raster geändert");
    S.state.room.cols=nc;S.state.room.rows=nr;
    dropped.forEach(function(t){removeTable(t.id);});
    if(mDrop.length)S.state.room.furniture=furniture().filter(function(f){return mDrop.indexOf(f)===-1;});
    drawEditor();toast("Raster: "+nc+" × "+nr+" Felder.");
  }
  if(dropped.length||mDrop.length){
    S.confirmBox((dropped.length?dropped.length+(dropped.length===1?" Tisch liegt":" Tische liegen"):"")+
      (dropped.length&&mDrop.length?" und ":"")+(mDrop.length?mDrop.length+" Möbelstück(e)":"")+
      " außerhalb des neuen Rasters und würden entfernt. Fortfahren?",los,function(){
        el("edCols").value=S.state.room.cols;el("edRows").value=S.state.room.rows;
      },{ja:"Entfernen und anpassen",gefahr:true});
    return;
  }
  los();
}
/* Miniatur einer Raumvorlage als kleine Zeichnung */
export function miniatur(d){
  var W_=78,H_=56;
  if(!d)return '<svg viewBox="0 0 '+W_+" "+H_+'" aria-hidden="true"><rect x="3" y="3" width="72" height="50" rx="6" style="fill:none;stroke:var(--border-strong);stroke-dasharray:3 3"/>'+
    '<path d="M39 21v14M32 28h14" style="stroke:var(--faint);stroke-width:2;stroke-linecap:round"/></svg>';
  var c=Math.min((W_-4)/d.cols,(H_-4)/d.rows),ox=(W_-c*d.cols)/2,oy=(H_-c*d.rows)/2,s="";
  (d.furniture||[]).forEach(function(f){
    s+='<rect x="'+(ox+f.x*c+.4)+'" y="'+(oy+f.y*c+c*.25)+'" width="'+Math.max(1,f.w*c-.8)+'" height="'+(c*.5)+'" rx="1" style="fill:'+
      (f.type==="board"?"var(--board)":"var(--border-strong)")+'"/>';
  });
  (d.tables||[]).forEach(function(t){
    var w=(t.dir==="h"?t.seats:1)*c,h=(t.dir==="h"?1:t.seats)*c;
    var rx0=ox+t.x*c+.4,ry0=oy+t.y*c+.4;
    s+='<rect x="'+rx0+'" y="'+ry0+'" width="'+Math.max(1,w-.8)+'" height="'+Math.max(1,h-.8)+'" rx="1.2" style="fill:var(--table);stroke:var(--table-line);stroke-width:.6"'+
      (t.winkel?' transform="rotate('+t.winkel+" "+(ox+t.x*c+w/2)+" "+(oy+t.y*c+h/2)+')"':"")+"/>";
  });
  return '<svg viewBox="0 0 '+W_+" "+H_+'" aria-hidden="true">'+s+"</svg>";
}
export function drawTemplates(){
  var box=el("tplBox");if(!box)return;
  var h="",vorher=null;
  templateList().forEach(function(v){
    if(v.fest!==vorher){
      h+='<div class="tplsec">'+(v.fest?"Voreingestellt":"Eigene Vorlagen")+"</div>";
      vorher=v.fest;
    }
    var plaetze=v.data?v.data.tables.reduce(function(a,t){return a+t.seats;},0):0;
    h+='<div class="tplcard'+(v.data?"":" leer")+'"><div class="tplmini">'+miniatur(v.data)+"</div>"+
      '<div class="tplinfo"><strong>'+esc(v.data?v.name:v.name+" – noch frei")+"</strong>"+
      "<span>"+(v.data?(v.info?esc(v.info)+" · ":"")+plaetze+" Plätze":"Aktuellen Raum hier ablegen")+"</span>"+
      '<div class="rowf">'+(v.data?'<button type="button" class="btn sm" data-tpl-use="'+v.key+'">Anwenden</button>':"")+
      (v.fest?"":'<button type="button" class="btn sm ghost" data-tpl-save="'+v.slot+'">'+(v.data?"Überschreiben":"Speichern")+"</button>")+
      "</div></div></div>";
  });
  box.innerHTML=h;
  box.querySelectorAll("[data-tpl-use]").forEach(function(b){
    b.onclick=function(){applyTemplate(templateList().filter(function(v){return v.key===b.dataset.tplUse;})[0]);};
  });
  box.querySelectorAll("[data-tpl-save]").forEach(function(b){
    b.onclick=function(){saveTemplate(b.dataset.tplSave);};
  });
}
export function removeTable(id){
  var t=S.state.tables.filter(function(x){return x.id===id;})[0];
  if(t)for(var i=0;i<t.seats;i++){
    delete S.state.seatMeta[seatKey(id,i)];delete S.state.arrangement[seatKey(id,i)];
  }
  S.state.tables=S.state.tables.filter(function(x){return x.id!==id;});
  if(S.edSel===id)S.edSel=null;
}
function addTable(n){
  var t={id:uid("t"),x:0,y:1,seats:n,dir:"h"};
  for(var y=1;y<S.state.room.rows;y++)for(var x=0;x<S.state.room.cols;x++){
    if(fits(t,x,y)&&!overlaps(t,x,y)){
      schritt(tischName(t)+" hinzugefügt");
      t.x=x;t.y=y;S.state.tables.push(t);S.edSel=t.id;S.edFokus={art:"table",id:t.id};drawEditor();return;
    }
  }
  toast("Kein freier Platz – Raster vergrößern oder einen Tisch löschen.","w");
}
function templateList(){
  var tpl=S.state.roomTemplates||(S.state.roomTemplates={B:null,C:null});
  return[
    {key:"A",name:"A · Standard-Klassenzimmer",info:"3 Doppelbänke je Reihe, 5 Reihen",data:vorlageA(),fest:true},
    {key:"B",name:"B · Klassenzimmer quer",info:"2er, 4er, 2er je Reihe, 3 Reihen",data:vorlageB(),fest:true},
    {key:"C",name:"C · NaWi-Raum",info:"7 Plätze je Reihe, 4 Reihen",data:vorlageC(),fest:true},
    {key:"E1",slot:"B",name:tpl.B?(tpl.B.name||"Eigene Vorlage 1"):"Eigene Vorlage 1",data:tpl.B,fest:false},
    {key:"E2",slot:"C",name:tpl.C?(tpl.C.name||"Eigene Vorlage 2"):"Eigene Vorlage 2",data:tpl.C,fest:false}
  ];
}
function applyTemplate(v){
  if(!v.data)return;
  S.confirmBox('Raum durch „'+v.name+'“ ersetzen? Die aktuelle Tischanordnung geht verloren, die Klassenliste bleibt.',function(){
    var d=v.data;
    schritt("Vorlage angewendet");
    S.state.room.cols=d.cols;S.state.room.rows=d.rows;
    S.state.tables=JSON.parse(JSON.stringify(d.tables)).map(function(t){t.id=uid("t");return t;});
    S.state.room.furniture=JSON.parse(JSON.stringify(d.furniture||[])).map(function(f){f.id=uid("f");return f;});
    S.state.seatMeta={};S.state.arrangement={};S.edSel=null;
    renderRoomTab();renderAll();
    toast('Vorlage „'+v.name+'“ übernommen: '+S.state.tables.length+" Tische.");
    if(!hatLehrertisch()&&lehrerRegelAnzahl())toast("In diesem Raum steht kein Lehrertisch – die Regel „Nah am Lehrertisch“ ruht.","w");
  });
}
function saveTemplate(key){
  var nr=key==="C"?2:1;
  openModal(function(b){
    b.innerHTML="<h3>Aktuellen Raum als eigene Vorlage "+nr+" speichern</h3>"+
      '<p class="hint">Gespeichert werden Tische, Tafel, Möbel und Rastergröße – nicht die Klassenliste und nicht die Regeln.</p>'+
      '<div class="rowf"><input type="text" id="tplName" placeholder="Name der Vorlage" aria-label="Name der Vorlage" '+
      'value="'+esc((S.state.roomTemplates[key]&&S.state.roomTemplates[key].name)||("Eigene Vorlage "+nr))+'" style="flex:1 1 220px">'+
      '<button type="button" id="tplSave" class="btn primary">Speichern</button></div>';
    el("tplSave").onclick=function(){
      schritt("Vorlage gespeichert");
      S.state.roomTemplates[key]={
        name:kurztext(el("tplName").value,60)||("Eigene Vorlage "+nr),
        cols:S.state.room.cols,rows:S.state.room.rows,
        tables:JSON.parse(JSON.stringify(S.state.tables)),
        furniture:JSON.parse(JSON.stringify(furniture()))
      };
      save();closeModal();renderRoomTab();
      toast("Eigene Vorlage "+nr+" gespeichert.");
    };
  });
}
function addFurniture(type){
  var f={id:uid("f"),type:type,x:0,y:0,
         w:type==="board"?Math.max(3,Math.min(6,S.state.room.cols)):2,
         label:type==="board"?"Tafel":"Lehrertisch"};
  for(var y=0;y<S.state.room.rows;y++)for(var x=0;x<S.state.room.cols;x++){
    if(fitsBox("furniture",f,x,y)&&!collides("furniture",f,x,y)){
      var warOhne=type==="desk"&&!hatLehrertisch();
      schritt(f.label+" hinzugefügt");
      f.x=x;f.y=y;furniture().push(f);S.edSel=f.id;S.edFokus={art:"furn",id:f.id};drawEditor();
      if(warOhne&&lehrerRegelAnzahl())toast("Die Regel „Nah am Lehrertisch“ gilt wieder ("+lehrerRegelAnzahl()+(lehrerRegelAnzahl()===1?" Person).":" Personen)."));
      return;
    }
  }
  toast("Kein freier Platz – Raster vergrößern.","w");
}
S.edFokus=null;
function editorFokusMerken(cv){
  var a=document.activeElement;
  if(!a||!cv.contains(a))return null;
  if(a.classList.contains("seatdot"))return{art:"dot",id:a.parentNode.dataset.id,idx:a.dataset.seat};
  if(a.classList.contains("et"))return{art:"table",id:a.dataset.id};
  if(a.dataset.fid)return{art:"furn",id:a.dataset.fid};
  return null;
}
function editorFokusSetzen(cv,f){
  if(!f)return;
  var n=null;
  if(f.art==="dot")n=cv.querySelector('.et[data-id="'+f.id+'"] .seatdot[data-seat="'+f.idx+'"]');
  else if(f.art==="table")n=cv.querySelector('.et[data-id="'+f.id+'"]');
  else if(f.art==="furn")n=cv.querySelector('[data-fid="'+f.id+'"]');
  if(n)try{n.focus({preventScroll:true});}catch(e){n.focus();}
}
export function sitzpunktFokus(d){
  if(!d||d.tid===null)return;
  setTimeout(function(){editorFokusSetzen(el("edCanvas")||document,{art:"dot",id:d.tid,idx:d.idx});},20);
}
export function drawEditor(){
  var cv=el("edCanvas");if(!cv)return;
  var fokus=S.edFokus||editorFokusMerken(cv);S.edFokus=null;
  var est=el("edStage"),er=est?est.getBoundingClientRect():{width:0,height:0};
  var eaw=Math.max(200,er.width-34-104),eah=Math.max(160,er.height-30-56);
  var zr=zoomWert("raum"),epass=Math.min(eaw/S.state.room.cols,eah/S.state.room.rows);
  var minZelle=eaw<420?16:26;if(zr<1)minZelle=Math.min(minZelle,18);
  S.EDCELL=Math.floor(Math.max(minZelle,Math.min(96,epass*zr)));
  cv.style.setProperty("--cell",S.EDCELL+"px");
  cv.style.width=(S.state.room.cols*S.EDCELL)+"px";
  cv.style.height=(S.state.room.rows*S.EDCELL)+"px";
  cv.innerHTML="";
  furniture().forEach(function(f){
    var node=document.createElement("div");
    node.className=(f.type==="board"?"ed-board":"ed-desk")+(S.edSel===f.id?" sel":"");
    node.dataset.fid=f.id;
    node.style.left=(f.x*S.EDCELL+2)+"px";
    node.style.top=(f.y*S.EDCELL+S.EDCELL*0.26)+"px";
    node.style.width=(f.w*S.EDCELL-4)+"px";
    node.style.height=(S.EDCELL*0.48)+"px";
    node.innerHTML="<span>"+esc(f.label)+"</span>";
    node.title=f.label+" – ziehen zum Verschieben";
    node.tabIndex=0;node.setAttribute("role","button");
    node.setAttribute("aria-label",f.label+", Spalte "+(f.x+1)+", Reihe "+(f.y+1)+", "+f.w+" Felder breit"+(S.edSel===f.id?", ausgewählt":""));
    cv.appendChild(node);
    attachFurnDrag(node,f);
    editorTasten(node,f,"furniture");
  });
  S.state.tables.forEach(function(t){
    var w=t.dir==="h"?t.seats:1,h=t.dir==="h"?1:t.seats;
    var node=document.createElement("div");
    node.className="et"+(S.edSel===t.id?" sel":"");
    node.dataset.id=t.id;
    node.style.left=(t.x*S.EDCELL+2)+"px";node.style.top=(t.y*S.EDCELL+2)+"px";
    node.style.width=(w*S.EDCELL-4)+"px";node.style.height=(h*S.EDCELL-4)+"px";
    if(t.winkel)node.style.transform="rotate("+t.winkel+"deg)";
    node.addEventListener("wheel",function(e){
      if(!(e.shiftKey||e.altKey))return;              /* Umschalt (oder Alt) + Mausrad dreht in 5°-Schritten */
      e.preventDefault();
      var d=e.deltaY||e.deltaX;if(e.deltaMode===1)d*=33;
      S.radAkku+=d;
      if(Math.abs(S.radAkku)<40)return;
      var r=S.radAkku>0?5:-5;S.radAkku=0;
      tischDrehen(t,r);
    },{passive:false});
    for(var i=0;i<t.seats;i++){
      var m=meta(seatKey(t.id,i));
      var dot=document.createElement("div");
      dot.className="seatdot"+(m.blocked?" blk":"")+
        ((multiAn()&&S.multiSel[seatKey(t.id,i)])?" msel":"")+((S.seatMenu.tid===t.id&&S.seatMenu.idx===i)?" cur":"");
      var pad2=Math.max(7,Math.round(S.EDCELL*0.16));
      dot.style.left=((t.dir==="h"?i*S.EDCELL:0)+pad2)+"px";
      dot.style.top=((t.dir==="h"?0:i*S.EDCELL)+pad2)+"px";
      dot.style.width=(S.EDCELL-2*pad2-4)+"px";dot.style.height=(S.EDCELL-2*pad2-4)+"px";
      if(m.tags.length&&!m.blocked){var tg=tagById(m.tags[0]);if(tg){dot.style.background=tg.color;dot.style.color="#fff";}}
      dot.textContent=m.blocked?"×":String(i+1);
      dot.title=multiAn()?"antippen zum Aus- oder Abwählen"
        :((m.blocked?"gesperrt":"Platz "+(i+1))+" – antippen für Merkmale");
      dot.dataset.seat=String(i);
      dot.tabIndex=0;dot.setAttribute("role","button");
      var tagNamen=m.tags.map(function(id){var x=tagById(id);return x?x.name:"";}).filter(Boolean).join(", ");
      dot.setAttribute("aria-label","Platz "+(i+1)+(m.blocked?", gesperrt":"")+(tagNamen?", Merkmale: "+tagNamen:"")+
        (multiAn()?(S.multiSel[seatKey(t.id,i)]?", ausgewählt":", nicht ausgewählt"):""));
      if(multiAn())dot.setAttribute("aria-pressed",S.multiSel[seatKey(t.id,i)]?"true":"false");
      node.appendChild(dot);
    }
    node.tabIndex=0;node.setAttribute("role","button");
    node.setAttribute("aria-label",tischName(t)+(t.dir==="v"?" längs":"")+(t.winkel?", um "+t.winkel+" Grad gedreht":"")+", Spalte "+(t.x+1)+", Reihe "+(t.y+1)+(S.edSel===t.id?", ausgewählt":""));
    cv.appendChild(node);
    attachDrag(node,t);
    editorTasten(node,t,"table");
  });
  drawTablePanel();
  editorFokusSetzen(cv,fokus);
}
/* Drehen in 5°-Schritten; schnelle Folgeschritte bilden einen gemeinsamen Rückgängig-Schritt */
S.radAkku=0;
S.letzteDrehung=null;
S.drehHinweisZeit=0;
function drehSchritt(t,ohneFokus){
  var jetzt=Date.now();
  if(S.letzteDrehung&&S.letzteDrehung.id===t.id&&jetzt-S.letzteDrehung.zeit<900){Store.label="Tisch gedreht";pruefeBald();}
  else schritt("Tisch gedreht");
  S.letzteDrehung={id:t.id,zeit:jetzt};
}
function keinPlatzZumDrehen(){
  if(Date.now()-S.drehHinweisZeit>2500){
    S.drehHinweisZeit=Date.now();
    toast("Zum Drehen fehlt hier der Platz – erst etwas Abstand zu Wand und Nachbartischen schaffen.","w");
  }
  ansage("Zum Drehen ist kein Platz frei.");
  return false;
}
/* 90°, 180° und 270°: Der Tisch steht danach gerade (quer oder längs) und genau im Raster. */
function tischRechtwinklig(t,viertel,ohneFokus){
  var altDir=t.dir,altX=t.x,altY=t.y,altW=t.winkel,ziel=null,neuDir=t.dir;
  function zurueck(){t.dir=altDir;t.x=altX;t.y=altY;if(altW)t.winkel=altW;else delete t.winkel;}
  delete t.winkel;
  if(viertel===2){if(fits(t,t.x,t.y)&&!overlaps(t,t.x,t.y))ziel={x:t.x,y:t.y};}
  else{
    var L=viertelLagen(t);neuDir=L.dir;t.dir=L.dir;
    for(var i=0;i<L.lagen.length&&!ziel;i++){var l=L.lagen[i];if(fits(t,l.x,l.y)&&!overlaps(t,l.x,l.y))ziel=l;}
  }
  zurueck();
  if(!ziel)return keinPlatzZumDrehen();
  drehSchritt(t,ohneFokus);
  t.dir=neuDir;t.x=ziel.x;t.y=ziel.y;delete t.winkel;
  /* quer→längs im Uhrzeigersinn (viertel=1) behält die Reihenfolge, gegen den Uhrzeigersinn (3) kehrt sie um;
     längs→quer genau umgekehrt; 180° kehrt immer um */
  var umkehren=viertel===2?true:(altDir==="h"?viertel===3:viertel===1);
  if(umkehren&&t.seats>1)plaetzeUmkehren(t.id,t.seats);
  S.edSel=t.id;if(!ohneFokus)S.edFokus={art:"table",id:t.id};
  drawEditor();
  ansage("Tisch steht jetzt "+(t.dir==="h"?"quer":"längs")+" und rastet im Raster ein.");
  return true;
}
export function tischDrehen(t,wert,absolut,ohneFokus){
  var alt=t.winkel||0,roh=Math.round(Number(absolut?wert:alt+wert)/5)*5;
  if(!isFinite(roh))return false;
  var r=((roh%360)+360)%360;
  if(r===90||r===270)return tischRechtwinklig(t,r===90?1:3,ohneFokus);
  if(r===180&&absolut)return tischRechtwinklig(t,2,ohneFokus);
  var neu=winkelNorm(roh);
  if(neu===alt)return true;
  if(neu)t.winkel=neu;else delete t.winkel;
  var ok=fits(t,t.x,t.y)&&!overlaps(t,t.x,t.y);
  if(alt)t.winkel=alt;else delete t.winkel;
  if(!ok)return keinPlatzZumDrehen();
  drehSchritt(t,ohneFokus);
  if(neu)t.winkel=neu;else delete t.winkel;
  S.edSel=t.id;if(!ohneFokus)S.edFokus={art:"table",id:t.id};
  drawEditor();
  ansage(neu?"Tisch um "+neu+" Grad gedreht.":"Tisch steht wieder gerade.");
  return true;
}
/* Lehrertisch gelöscht, verschoben oder verbreitert: auf die Regel „Nah am Lehrertisch“ hinweisen */
S.lehrerHinweisTimer=null;
export function lehrertischGeaendert(){
  var n=lehrerRegelAnzahl();if(!n)return;
  clearTimeout(S.lehrerHinweisTimer);
  S.lehrerHinweisTimer=setTimeout(function(){
    reindex();
    var seats=usableSeats(),adj=buildAdj(seats);
    if(!adj.lehrer)return;
    var belegt=Object.keys(S.state.arrangement).length;
    var r=evaluate(S.state.arrangement,seats,adj).issues.filter(function(i){return i.type==="lehrer";}).length;
    toast("Lehrertisch verändert: „Nah am Lehrertisch“ ("+n+(n===1?" Person":" Personen")+") gilt jetzt von hier aus. "+
      (!belegt?"Beim nächsten „Neu anordnen“ wird das berücksichtigt."
       :r?(r===1?"1 Person sitzt":r+" Personen sitzen")+" jetzt zu weit weg – neu anordnen oder im Sitzplan „Beheben“ nutzen."
       :"Alle sitzen weiterhin nah genug."),r?"w":"");
  },700);
}
export function moebelLoeschen(f,danach){
  var letzter=f.type==="desk"&&furniture().filter(function(x){return x.type==="desk";}).length===1;
  var n=lehrerRegelAnzahl();
  function los(){
    schritt((f.label||"Möbelstück")+" gelöscht");
    S.state.room.furniture=furniture().filter(function(x){return x.id!==f.id;});
    if(S.edSel===f.id)S.edSel=null;
    drawEditor();
    if(danach)danach();
  }
  if(letzter&&n){
    S.confirmBox("Ohne Lehrertisch entfällt die Regel „Nah am Lehrertisch“ für "+(n===1?"1 Person":n+" Personen")+
      ". Sie gilt wieder, sobald ein Lehrertisch im Raum steht. Lehrertisch trotzdem entfernen?",los,null,{ja:"Entfernen",gefahr:true});
    return;
  }
  los();
}
/* Tastatur im Raumeditor: Pfeile verschieben, R dreht um 90°, Q/E um 5°, Entfernen löscht, Eingabe wählt aus */
function editorTasten(node,obj,art){
  node.addEventListener("keydown",function(e){
    var dot=e.target.closest?e.target.closest(".seatdot"):null;
    if(dot){
      if(e.key==="Enter"||e.key===" "){
        e.preventDefault();e.stopPropagation();
        var idx=parseInt(dot.dataset.seat,10);
        if(multiAn()){
          var kk=seatKey(obj.id,idx);
          if(S.multiSel[kk])delete S.multiSel[kk];else S.multiSel[kk]=1;
          S.edFokus={art:"dot",id:obj.id,idx:String(idx)};drawEditor();
        }else openSeatMenu(obj.id,idx);
      }
      return;
    }
    if(e.target!==node)return;
    var d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    var fokusArt=(art==="table")?"table":"furn";
    var name=(art==="table")?"Tisch":obj.label;
    if(d){
      e.preventDefault();
      var nx=obj.x+d[0],ny=obj.y+d[1];
      if(fitsBox(art,obj,nx,ny)&&!collides(art,obj,nx,ny)){
        schritt(name+" verschoben");
        obj.x=nx;obj.y=ny;S.edSel=obj.id;S.edFokus={art:fokusArt,id:obj.id};drawEditor();
        ansage(name+" jetzt in Spalte "+(nx+1)+", Reihe "+(ny+1)+".");
        if(art==="furniture"&&obj.type==="desk")lehrertischGeaendert();
      }else ansage("Dort ist kein Platz frei.");
      return;
    }
    if(e.key==="Enter"||e.key===" "){e.preventDefault();S.edSel=obj.id;S.edFokus={art:fokusArt,id:obj.id};drawEditor();return;}
    if(art==="table"&&/^[qQeE]$/.test(e.key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      e.preventDefault();tischDrehen(obj,/^[qQ]$/.test(e.key)?-5:5);return;
    }
    if(art==="table"&&(e.key==="r"||e.key==="R")&&!e.ctrlKey&&!e.metaKey){
      e.preventDefault();
      var alt=obj.dir;obj.dir=alt==="h"?"v":"h";
      if(!fits(obj,obj.x,obj.y)||overlaps(obj,obj.x,obj.y)){obj.dir=alt;ansage("Zum Drehen ist kein Platz frei.");return;}
      obj.dir=alt;schritt("Tisch gedreht");obj.dir=alt==="h"?"v":"h";
      S.edSel=obj.id;S.edFokus={art:"table",id:obj.id};drawEditor();ansage("Tisch gedreht.");
      return;
    }
    if(e.key==="Delete"||e.key==="Backspace"){
      e.preventDefault();
      if(art==="table"){
        schritt(name+" gelöscht");removeTable(obj.id);drawEditor();
        toast(name+" gelöscht – mit ↶ (Strg+Z) rückgängig machen.");
      }else moebelLoeschen(obj,function(){toast(name+" gelöscht – mit ↶ (Strg+Z) rückgängig machen.");});
    }
  });
}
function attachFurnDrag(node,f){
  var sx=0,sy=0,ox=0,oy=0,dragging=false,moved=false;
  node.addEventListener("pointerdown",function(e){
    if(e.button&&e.button!==0)return;
    S.edSel=f.id;drawTablePanel();
    document.querySelectorAll(".ed-board,.ed-desk").forEach(function(n){
      n.classList.toggle("sel",n.dataset.fid===f.id);
    });
    document.querySelectorAll(".et").forEach(function(n){n.classList.remove("sel");});
    dragging=true;moved=false;node.classList.add("drag");
    sx=e.clientX;sy=e.clientY;ox=f.x;oy=f.y;
    try{node.setPointerCapture(e.pointerId);}catch(err){}
    e.preventDefault();
  });
  node.addEventListener("pointermove",function(e){
    if(!dragging)return;
    var nx=ox+Math.round((e.clientX-sx)/S.EDCELL);
    var ny=oy+Math.round((e.clientY-sy)/S.EDCELL);
    if(nx!==f.x||ny!==f.y)moved=true;
    var ok=fitsBox("furniture",f,nx,ny)&&!collides("furniture",f,nx,ny);
    node.classList.toggle("bad",!ok);
    node.style.left=(nx*S.EDCELL+2)+"px";
    node.style.top=(ny*S.EDCELL+S.EDCELL*0.26)+"px";
    node.dataset.nx=nx;node.dataset.ny=ny;
  });
  function end(){
    if(!dragging)return;
    dragging=false;node.classList.remove("drag","bad");
    if(moved){
      var nx=parseInt(node.dataset.nx,10),ny=parseInt(node.dataset.ny,10);
      if(!isNaN(nx)&&!isNaN(ny)&&fitsBox("furniture",f,nx,ny)&&!collides("furniture",f,nx,ny)){
        schritt(f.label+" verschoben");
        f.x=nx;f.y=ny;
        if(f.type==="desk")lehrertischGeaendert();
      }else toast("Dort ist kein Platz frei.","w");
    }
    drawEditor();
  }
  node.addEventListener("pointerup",end);
  node.addEventListener("pointercancel",end);
}
function attachDrag(node,t){
  var sx=0,sy=0,ox=0,oy=0,dragging=false,moved=false;
  var downSeat=null;
  node.addEventListener("pointerdown",function(e){
    if(e.button&&e.button!==0)return;
    var dot=e.target.closest?e.target.closest(".seatdot"):null;
    downSeat=dot?dot.dataset.seat:null;
    S.edSel=t.id;
    var all=document.querySelectorAll(".et");
    for(var i=0;i<all.length;i++)all[i].classList.toggle("sel",all[i].dataset.id===t.id);
    drawTablePanel();
    dragging=true;moved=false;node.classList.add("drag");
    sx=e.clientX;sy=e.clientY;ox=t.x;oy=t.y;
    try{node.setPointerCapture(e.pointerId);}catch(err){}
    e.preventDefault();
  });
  node.addEventListener("pointermove",function(e){
    if(!dragging)return;
    var nx=ox+Math.round((e.clientX-sx)/S.EDCELL);
    var ny=oy+Math.round((e.clientY-sy)/S.EDCELL);
    if(nx!==t.x||ny!==t.y)moved=true;
    var ok=fits(t,nx,ny)&&!overlaps(t,nx,ny);
    node.classList.toggle("bad",!ok);
    node.style.left=(nx*S.EDCELL+2)+"px";node.style.top=(ny*S.EDCELL+2)+"px";
    node.dataset.nx=nx;node.dataset.ny=ny;
  });
  function end(){
    if(!dragging)return;
    dragging=false;node.classList.remove("drag","bad");
    if(moved){
      var nx=parseInt(node.dataset.nx,10),ny=parseInt(node.dataset.ny,10);
      if(!isNaN(nx)&&!isNaN(ny)&&fits(t,nx,ny)&&!overlaps(t,nx,ny)){schritt("Tisch verschoben");t.x=nx;t.y=ny;}
      else toast("Dort passt der Tisch nicht hin.","w");
      drawEditor();
    }else if(downSeat!==null){
      var idx=parseInt(downSeat,10);
      downSeat=null;
      if(multiAn()){
        var kk=seatKey(t.id,idx);
        if(S.multiSel[kk])delete S.multiSel[kk];else S.multiSel[kk]=1;
        drawEditor();
        return;
      }
      drawEditor();
      openSeatMenu(t.id,idx);
      return;
    }else drawEditor();
    downSeat=null;
  }
  node.addEventListener("pointerup",end);
  node.addEventListener("pointercancel",end);
}
