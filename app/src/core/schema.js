import { uid } from "./basis.js";
import { EINZUG, imRaum, polyUeberlappen, rechteckForm, tischForm, viertelLagen, winkelNorm } from "./geometrie.js";
import { SCHEMA, hasOwn } from "./konstanten.js";
import { STUFEN, lehrerStufe } from "./regeln.js";
import { vorlageA } from "./vorlagen.js";
import { NAMENSFORMATE, nameTeilen } from "./zustand.js";
import { S } from "../store.js";
import { boxCells } from "../ui/plan-ansicht.js";

/* ===================== Datenformat: Migration und Prüfung ===================== */
export var FARBE_RE=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
var STANDARD_FARBEN=["#2c5f8a","#b8528a","#6a8f3c","#a8791b","#7a4fa0","#3d8b8b"];
var ID_RE=/^[A-Za-z0-9_\-.:]{1,64}$/;
var RESERVIERT=/^(?:__proto__|constructor|prototype|hasOwnProperty|toString|valueOf)$/;
S.ladeFehler=false;
export function ganzzahl(v,min,max,def){
  var n=v;
  if(typeof n==="string"&&n.trim()!=="")n=Number(n);
  if(typeof n!=="number"||!isFinite(n))return def;
  n=Math.round(n);
  return Math.max(min,Math.min(max,n));
}
export function kurztext(v,max){
  if(typeof v!=="string")return "";
  v=v.replace(/[\u0000-\u001f\u007f]+/g," ").trim();
  return v.length>max?v.slice(0,max).trim():v;
}
function datenFehler(text){var e=new Error(text);e.datenFehler=true;return e;}
/* Zahlen als Kennung (ältere oder von Hand erstellte Dateien) wie Text behandeln */
function alsId(v){return(typeof v==="number"&&isFinite(v))?String(v):v;}
/* Rastergröße der ersten Fassung – je nach Stand oben oder in einem Unterobjekt gespeichert */
function rasterMasse(p){
  var quellen=[p,p.room,p.grid,p.layout,p.raster,p.raum];
  for(var i=0;i<quellen.length;i++){
    var q=quellen[i];
    if(q&&typeof q==="object"&&q.rows!==undefined&&q.cols!==undefined)return{rows:q.rows,cols:q.cols};
  }
  return null;
}
function versionVon(p){
  var v=(typeof p.v==="number"&&isFinite(p.v))?p.v:((typeof p.v==="string"&&/^\s*\d+\s*$/.test(p.v))?Number(p.v):null);
  if(Array.isArray(p.tables))return(v!==null&&v>=2)?v:2;
  if(v!==null&&v>=2)return v;
  if(p.seats&&typeof p.seats==="object")return 1;                 /* erste Fassung: Raster aus Plätzen */
  if(rasterMasse(p)||v===1)return 1;
  return 0;
}
/* Sicherungen, die in einer Hülle stecken („state“, „plan“, „daten“ …) oder als Liste gespeichert wurden */
export function auspacken(p){
  for(var i=0;i<4;i++){
    if(Array.isArray(p)){
      var f=p.filter(function(x){return x&&typeof x==="object"&&!Array.isArray(x)&&(x.students||x.tables);})[0];
      if(!f)return p;
      p=f;continue;
    }
    if(p&&typeof p==="object"&&!p.students&&!p.tables){
      var k=["state","plan","sitzplan","daten","data","inhalt","sicherung"].filter(function(k){return p[k]&&typeof p[k]==="object";})[0];
      if(k){p=p[k];continue;}
    }
    break;
  }
  return p;
}
/* Klassenliste auch als Objekt (Kennung → Person) oder als reine Namensliste annehmen */
function schuelerListe(l){
  if(l&&typeof l==="object"&&!Array.isArray(l)){
    l=Object.keys(l).map(function(k){
      var x=l[k];
      if(typeof x==="string")return{id:k,name:x};
      if(x&&typeof x==="object"&&!Array.isArray(x)){
        var c={};Object.keys(x).forEach(function(j){c[j]=x[j];});
        if(c.id===undefined)c.id=k;
        return c;
      }
      return x;
    });
  }
  if(!Array.isArray(l))return l;
  return l.map(function(x){return(typeof x==="string")?{name:x}:x;});
}
/* Prüft eine Sicherung bzw. den gespeicherten Stand vollständig, hebt ältere Fassungen
   auf das aktuelle Format und bereinigt Unstimmigkeiten. Wirft bei unbrauchbaren Daten. */
export function pruefeUndMigriere(roh){
  var p=auspacken(roh);
  if(!p||typeof p!=="object"||Array.isArray(p))throw datenFehler("Die Datei enthält keinen Sitzplan.");
  p=JSON.parse(JSON.stringify(p));
  if(p.students!==undefined)p.students=schuelerListe(p.students);
  var v=versionVon(p),H=[];
  if(v>SCHEMA)throw datenFehler("Die Sicherung stammt aus einer neueren Fassung des Sitzplan-Generators. Bitte die aktuelle Fassung verwenden.");
  if(!Array.isArray(p.students)){
    if(v>=1&&(Array.isArray(p.tables)||p.room))p.students=[];      /* Raum ohne Klasse (z. B. nur der Raum gesichert) */
    else throw datenFehler("In der Datei wurde kein Sitzplan gefunden – weder Klassenliste noch Raum.");
  }
  if(v===1)p=migriereV1(p,H);
  else if(v<1){
    /* Aufbau unbekannt, aber eine Klassenliste ist da: Klasse und Regeln übernehmen, Raum neu */
    var a=vorlageA();
    p.room={cols:a.cols,rows:a.rows,furniture:a.furniture};p.tables=a.tables;p.arrangement={};p.seatMeta={};
    H.push("Raum und Sitzordnung ließen sich aus dieser älteren Datei nicht lesen. Klassenliste, Platzmerkmale und Regeln wurden übernommen; als Raum steht das Standard-Klassenzimmer bereit.");
  }
  return{state:normalisiere(p,H),hinweise:H,version:v};
}
function migrate(p){return pruefeUndMigriere(p).state;}      /* älterer Name */
function normGroup(g){
  if(Array.isArray(g))return{id:uid("g"),members:g.slice(),level:"moderat"};
  return{id:(g&&g.id)||uid("g"),members:(g&&g.members)||[],level:hasOwn(STUFEN,g&&g.level)?g.level:"moderat"};
}
/* Version 1: Raster aus Einzelplätzen („Reihe_Spalte“) → jeder Platz wird ein Einzeltisch */
function migriereV1(p,H){
  /* Platzschlüssel „Reihe_Spalte“ – auch „Reihe-Spalte“, „Reihe,Spalte“, „r2c3“ … */
  function rcLesen(k){var m=/^\D*(\d{1,2})\D+(\d{1,2})\D*$/.exec(String(k));return m?{r:+m[1],c:+m[2]}:null;}
  var altSitz={},altArr={},roh;
  roh=p.seats;
  if(Array.isArray(roh)){
    roh.forEach(function(z,r){
      if(Array.isArray(z))z.forEach(function(m,c){if(m&&typeof m==="object")altSitz[r+"_"+c]=m;});
      else if(z&&typeof z==="object"){var rr=ganzzahl(z.row!==undefined?z.row:z.r,0,99,-1),cc=ganzzahl(z.col!==undefined?z.col:z.c,0,99,-1);if(rr>=0&&cc>=0)altSitz[rr+"_"+cc]=z;}
    });
  }else if(roh&&typeof roh==="object")Object.keys(roh).forEach(function(k){var x=rcLesen(k);if(x)altSitz[x.r+"_"+x.c]=roh[k];});
  roh=p.arrangement;
  if(Array.isArray(roh)){
    roh.forEach(function(z,r){
      if(Array.isArray(z))z.forEach(function(sid,c){if(sid!==null&&sid!==undefined&&sid!=="")altArr[r+"_"+c]=alsId(sid);});
      else if(z&&typeof z==="object"){
        var rr=ganzzahl(z.row!==undefined?z.row:z.r,0,99,-1),cc=ganzzahl(z.col!==undefined?z.col:z.c,0,99,-1);
        var sid=z.student!==undefined?z.student:(z.sid!==undefined?z.sid:z.id);
        if(rr>=0&&cc>=0&&sid!==undefined&&sid!==null)altArr[rr+"_"+cc]=alsId(sid);
      }
    });
  }else if(roh&&typeof roh==="object")Object.keys(roh).forEach(function(k){var x=rcLesen(k);if(x)altArr[x.r+"_"+x.c]=alsId(roh[k]);});
  /* Größe: gespeichert oder aus den benutzten Plätzen */
  var maxR=-1,maxC=-1;
  Object.keys(altSitz).concat(Object.keys(altArr)).forEach(function(k){var x=rcLesen(k);if(x.r>maxR)maxR=x.r;if(x.c>maxC)maxC=x.c;});
  var q=rasterMasse(p)||{};
  var rows=Math.max(ganzzahl(q.rows,1,14,Math.max(4,maxR+1)),Math.min(14,maxR+1));
  var cols=Math.max(ganzzahl(q.cols,1,14,Math.max(6,maxC+1)),Math.min(14,maxC+1));
  var gap=(2+rows*2<=20)?2:1, start=(gap===2)?2:1;
  var rc=Math.max(4,cols), rr=Math.min(20,start+rows*gap);
  var off=Math.floor((rc-cols)/2);
  var tables=[],seatMeta={},arrangement={};
  for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
    var id="t_v1_"+r+"_"+c, alt=r+"_"+c, m=altSitz[alt];
    tables.push({id:id,x:off+c,y:start+r*gap,seats:1,dir:"h"});
    if(m&&typeof m==="object")seatMeta[id+"#0"]={tags:m.tags,locked:m.locked,blocked:m.blocked};
    if(hasOwn(altArr,alt))arrangement[id+"#0"]=altArr[alt];
  }
  var bw=Math.max(3,Math.min(cols,Math.round(cols*0.6))), bx=off+Math.floor((cols-bw)/2);
  var moebel=[{type:"board",x:bx,y:0,w:bw,label:"Tafel"}];
  if(bx+bw+2<=rc)moebel.push({type:"desk",x:bx+bw,y:0,w:2,label:"Lehrertisch"});
  H.push("Die Sicherung stammt aus der ersten Fassung (Raster ohne Tische). Jeder Platz wurde in einen Einzeltisch umgewandelt – Tafel und Lehrertisch bitte im Bereich „Raum“ prüfen.");
  function paare(liste,stufe){
    return (Array.isArray(liste)?liste:[]).map(function(x){
      return{members:Array.isArray(x)?x:(x&&x.members)||[],level:stufe};
    });
  }
  return{v:2,planName:p.planName,room:{cols:rc,rows:rr,furniture:moebel},tables:tables,
    seatMeta:seatMeta,students:p.students,tags:p.tags,
    blacklist:paare(p.blacklist,"moderat"),      /* v1: nicht neben- und nicht voreinander */
    whitelist:paare(p.whitelist,"schwach"),      /* v1: neben- oder voreinander */
    arrangement:arrangement,options:{},security:{hash:null}};
}
/* Version 2 ohne Möbelliste: Tafel und Lehrertisch aus der alten Einstellung ableiten */
function legacyMoebel(p){
  var room=(p.room&&typeof p.room==="object")?p.room:{};
  var cols=ganzzahl(room.cols,4,24,14),mn=null,mx=null;
  (Array.isArray(p.tables)?p.tables:[]).forEach(function(t){
    if(!t||typeof t!=="object")return;
    var n=ganzzahl(t.seats,1,8,0),x=ganzzahl(t.x,0,99,0);
    for(var i=0;i<n;i++){
      var cx=(t.dir==="v")?x:x+i;
      if(mn===null||cx<mn)mn=cx;
      if(mx===null||cx>mx)mx=cx;
    }
  });
  if(mn===null){mn=0;mx=cols-1;}
  var span=mx-mn+1;
  var bw=Math.max(3,Math.min(span,Math.round(span*0.6)));
  if((span-bw)%2){if(bw+1<=span)bw++;else bw--;}
  var bx=mn+Math.floor((span-bw)/2);
  var dp=room.deskPos||"left",desk=null;
  if(dp!=="none"){
    /* Lehrertisch neben die Tafel stellen; reicht der Raum nicht, wird die Tafel schmaler */
    var dw=2,links=(dp==="left");
    var dx=links?bx-dw:bx+bw;
    if(links&&dx<0){var d=-dx;bx+=d;bw-=d;dx=0;}
    if(!links&&dx+dw>cols){var d2=dx+dw-cols;bw-=d2;dx=bx+bw;}
    if(bw>=1&&dx>=0&&dx+dw<=cols)desk={type:"desk",x:dx,y:0,w:dw,label:"Lehrertisch"};
    else{bx=mn+Math.floor((span-Math.max(3,Math.min(span,Math.round(span*0.6))))/2);bw=Math.max(3,Math.min(span,Math.round(span*0.6)));}
  }
  var liste=[{type:"board",x:bx,y:0,w:bw,label:"Tafel"}];
  if(desk)liste.push(desk);
  return liste;
}
/* Tische und Möbel prüfen: Größe, Lage im Raum, keine Überlappung */
function raumObjekte(cols,rows,tables,furn,zaehle,neueId,tabMap){
  var belegt=Object.create(null),outT=[],outF=[],gedreht=[],spaeter=[],umkehr=Object.create(null),eingerastet=0;
  function keineGedrehten(poly){return gedreht.every(function(g){return !polyUeberlappen(g,poly);});}
  function keineZellen(poly){
    return !Object.keys(belegt).some(function(k){
      var p=k.split(",");return polyUeberlappen(poly,rechteckForm(+p[0],+p[1],1,1,EINZUG));
    });
  }
  function frei(cells){
    return cells.every(function(c){
      return c.x>=0&&c.y>=0&&c.x<cols&&c.y<rows&&!belegt[c.x+","+c.y];
    });
  }
  function markiere(cells){cells.forEach(function(c){belegt[c.x+","+c.y]=1;});}
  (Array.isArray(tables)?tables:[]).forEach(function(t){
    if(!t||typeof t!=="object"){zaehle("tisch");return;}
    var seats=ganzzahl(t.seats,1,8,0);
    if(!seats||outT.length>=200){zaehle("tisch");return;}
    var o={x:ganzzahl(t.x,0,99,0),y:ganzzahl(t.y,0,99,0),seats:seats,dir:t.dir==="v"?"v":"h"};
    var wk=winkelNorm(t.winkel);
    if(wk===90){
      /* rechtwinklig gedreht: erst nach allen anderen Tischen und Möbeln ins Raster setzen */
      var tidA=alsId(t.id);
      o.id=neueId(tidA,"t");
      if(tabMap&&typeof tidA==="string"&&!(tidA in tabMap))tabMap[tidA]=o.id;
      spaeter.push({o:o,platz:outT.length});outT.push(null);
      return;
    }
    if(wk){
      o.winkel=wk;
      var poly=tischForm(o,o.x,o.y,EINZUG);
      if(!imRaum(tischForm(o,o.x,o.y,0.02),cols,rows)||!keineGedrehten(poly)||!keineZellen(poly)){zaehle("tisch");return;}
      gedreht.push(poly);
    }else{
      var cells=boxCells("table",o,o.x,o.y);
      if(!frei(cells)||!keineGedrehten(tischForm(o,o.x,o.y,EINZUG))){zaehle("tisch");return;}
      markiere(cells);
    }
    var tidAlt=alsId(t.id);
    o.id=neueId(tidAlt,"t");
    if(tabMap&&typeof tidAlt==="string"&&!(tidAlt in tabMap))tabMap[tidAlt]=o.id;
    var aus={id:o.id,x:o.x,y:o.y,seats:o.seats,dir:o.dir};
    if(wk)aus.winkel=wk;
    outT.push(aus);
  });
  (Array.isArray(furn)?furn:[]).forEach(function(f){
    if(!f||typeof f!=="object"){zaehle("moebel");return;}
    var typ=f.type==="board"?"board":"desk";
    var o={x:ganzzahl(f.x,0,99,0),y:ganzzahl(f.y,0,99,0),w:ganzzahl(f.w,1,24,typ==="board"?4:2)};
    var cells=boxCells("furniture",o,o.x,o.y);
    if(!frei(cells)||!keineGedrehten(rechteckForm(o.x,o.y,o.w,1,EINZUG))||outF.length>=20){zaehle("moebel");return;}
    markiere(cells);
    outF.push({id:neueId(alsId(f.id),"f"),type:typ,x:o.x,y:o.y,w:o.w,
      label:kurztext(f.label,60)||(typ==="board"?"Tafel":"Lehrertisch")});
  });
  spaeter.forEach(function(d){
    var o=d.o,L=viertelLagen(o),probe={seats:o.seats,dir:L.dir},ziel=null,zellen=null;
    for(var i=0;i<L.lagen.length&&!ziel;i++){
      var l=L.lagen[i],c=boxCells("table",probe,l.x,l.y);
      if(frei(c)&&keineGedrehten(tischForm(probe,l.x,l.y,EINZUG))){ziel=l;zellen=c;}
    }
    if(ziel){
      markiere(zellen);
      outT[d.platz]={id:o.id,x:ziel.x,y:ziel.y,seats:o.seats,dir:L.dir};
      if(L.dir==="h"&&o.seats>1)umkehr[o.id]=o.seats;     /* längs → quer im Uhrzeigersinn */
      eingerastet++;
      return;
    }
    /* passt nicht ins Raster: wie bisher schräg (90°) übernehmen */
    o.winkel=90;
    var poly=tischForm(o,o.x,o.y,EINZUG);
    if(!imRaum(tischForm(o,o.x,o.y,0.02),cols,rows)||!keineGedrehten(poly)||!keineZellen(poly)){zaehle("tisch");return;}
    gedreht.push(poly);
    outT[d.platz]={id:o.id,x:o.x,y:o.y,seats:o.seats,dir:o.dir,winkel:90};
  });
  return{tables:outT.filter(Boolean),furniture:outF,umkehr:umkehr,eingerastet:eingerastet};
}
/* Geschlecht und Leistung auch in Worten („weiblich“, „f“, „stark“, „L1“ …) */
var GESCHLECHT_WORT={w:"w",f:"w",weiblich:"w",female:"w",frau:"w","mädchen":"w",maedchen:"w",girl:"w",
  m:"m","männlich":"m",maennlich:"m",male:"m",mann:"m",junge:"m",boy:"m",d:"d",divers:"d",diverse:"d",x:"x","":"x","–":"x","-":"x"};
function geschlechtLesen(v){
  if(typeof v!=="string")return null;
  var k=v.trim().toLowerCase();
  return hasOwn(GESCHLECHT_WORT,k)?GESCHLECHT_WORT[k]:null;
}
function stufeLesen(v){
  if(typeof v==="number"&&isFinite(v))return ganzzahl(v,1,3,2);
  if(typeof v!=="string")return null;
  var k=v.trim().toLowerCase(),m=/^l?\s*([123])$/.exec(k);
  if(m)return +m[1];
  if(/^-?\d+(\.\d+)?$/.test(k))return ganzzahl(k,1,3,2);
  if(/stark|hoch|gut|high/.test(k))return 3;
  if(/mittel|medium|normal/.test(k))return 2;
  if(/unterst|schwach|förder|foerder|niedrig|low/.test(k))return 1;
  return null;
}
function normalisiere(p,H){
  var z=Object.create(null),reihenfolge=[];
  function zaehle(k,n){if(!z[k]){z[k]=0;reihenfolge.push(k);}z[k]+=(n||1);}
  var vergeben=Object.create(null);
  function neueId(alt,praefix){
    if(typeof alt==="string"&&ID_RE.test(alt)&&!RESERVIERT.test(alt)&&!vergeben[alt]){vergeben[alt]=1;return alt;}
    if(alt!==undefined&&alt!==null)zaehle("id");
    var id;do{id=uid(praefix);}while(vergeben[id]);
    vergeben[id]=1;return id;
  }
  var out={v:SCHEMA};
  out.planName=kurztext(p.planName,80)||"Sitzplan";
  var room=(p.room&&typeof p.room==="object"&&!Array.isArray(p.room))?p.room:{};
  var cols=ganzzahl(room.cols,4,24,14),rows=ganzzahl(room.rows,3,20,9);
  if((room.cols!==undefined&&Number(room.cols)!==cols)||(room.rows!==undefined&&Number(room.rows)!==rows))zaehle("raum");
  out.room={cols:cols,rows:rows,furniture:[]};

  /* Tags */
  var tagMap=Object.create(null);out.tags=[];
  (Array.isArray(p.tags)?p.tags:[]).forEach(function(t){
    if(!t||typeof t!=="object"){zaehle("tag");return;}
    var name=kurztext(t.name,40);
    if(!name){zaehle("tag");return;}
    if(out.tags.length>=100){zaehle("limit");return;}
    var tid=alsId(t.id),id=neueId(tid,"tag");
    if(typeof tid==="string"&&!(tid in tagMap))tagMap[tid]=id;
    var farbe=(typeof t.color==="string"&&FARBE_RE.test(t.color))?t.color:STANDARD_FARBEN[out.tags.length%STANDARD_FARBEN.length];
    if(farbe!==t.color)zaehle("farbe");
    out.tags.push({id:id,name:name,color:farbe});
  });
  function tagsFiltern(liste){
    var res=[];
    (Array.isArray(liste)?liste:[]).forEach(function(t){
      t=alsId(t);
      var n=(typeof t==="string")?tagMap[t]:null;
      if(!n){zaehle("verweis");return;}
      if(res.indexOf(n)===-1)res.push(n);
    });
    return res;
  }

  /* Klassenliste */
  var stuMap=Object.create(null);out.students=[];
  (Array.isArray(p.students)?p.students:[]).forEach(function(s){
    if(!s||typeof s!=="object"){zaehle("person");return;}
    var vn=kurztext(s.vorname,60),nn=kurztext(s.nachname,60),name;
    if(vn||nn)name=(vn+" "+nn).trim();
    else{
      name=kurztext(s.name,60);
      if(!name){zaehle("person");return;}
      var tl=nameTeilen(name);vn=tl.vor;nn=tl.nach;name=(vn+" "+nn).trim();
    }
    if(out.students.length>=300){zaehle("limit");return;}
    var sid=alsId(s.id),id=neueId(sid,"s");
    if(typeof sid==="string"&&!(sid in stuMap))stuMap[sid]=id;
    var g=geschlechtLesen(s.gender);
    if(s.gender!==undefined&&s.gender!==null&&s.gender!==""&&g===null)zaehle("wert");
    if(g===null)g="x";
    var lv=stufeLesen(s.level);
    if(s.level!==undefined&&s.level!==null&&s.level!==""&&(lv===null||(/^\s*-?\d+(\.\d+)?\s*$/.test(String(s.level))&&Number(s.level)!==lv)))zaehle("wert");
    if(lv===null)lv=2;
    out.students.push({id:id,vorname:vn,nachname:nn,name:name,gender:g,level:lv,requiredTags:tagsFiltern(s.requiredTags),
      note:kurztext(s.note,300),solo:s.solo===true,lehrer:lehrerStufe(s.lehrer)});
  });

  /* Raum: Tische und Möbel */
  var tabMap=Object.create(null);
  var furnRoh=Array.isArray(room.furniture)?room.furniture:legacyMoebel(p);
  var ro=raumObjekte(cols,rows,p.tables,furnRoh,zaehle,neueId,tabMap);
  out.tables=ro.tables;out.room.furniture=ro.furniture;
  if(ro.eingerastet)zaehle("einrasten",ro.eingerastet);
  var gueltig=Object.create(null);
  out.tables.forEach(function(t){for(var i=0;i<t.seats;i++)gueltig[t.id+"#"+i]=1;});
  function platzKey(k){
    if(typeof k!=="string")return null;
    var pos=k.lastIndexOf("#");if(pos<1)return null;
    var tid=tabMap[k.slice(0,pos)],idx=k.slice(pos+1);
    if(!tid||!/^\d{1,2}$/.test(idx))return null;
    var nr=Number(idx);
    if(ro.umkehr[tid]&&nr<ro.umkehr[tid])nr=ro.umkehr[tid]-1-nr;
    var neuK=tid+"#"+nr;
    return gueltig[neuK]?neuK:null;
  }
  out.seatMeta={};
  var sm=(p.seatMeta&&typeof p.seatMeta==="object"&&!Array.isArray(p.seatMeta))?p.seatMeta:{};
  Object.keys(sm).forEach(function(k){
    var neuK=platzKey(k),m=sm[k];
    if(!neuK||!m||typeof m!=="object"){zaehle("verweis");return;}
    out.seatMeta[neuK]={tags:tagsFiltern(m.tags),locked:m.locked===true,blocked:m.blocked===true};
  });
  out.arrangement={};
  var gesetzt=Object.create(null);
  var ar=(p.arrangement&&typeof p.arrangement==="object"&&!Array.isArray(p.arrangement))?p.arrangement:{};
  Object.keys(ar).forEach(function(k){
    var wer=alsId(ar[k]),neuK=platzKey(k),sid=(typeof wer==="string")?stuMap[wer]:null;
    if(!neuK||!sid||gesetzt[sid]||hasOwn(out.arrangement,neuK)||
       (out.seatMeta[neuK]&&out.seatMeta[neuK].blocked)){zaehle("verweis");return;}
    out.arrangement[neuK]=sid;gesetzt[sid]=1;
  });

  /* Regeln */
  function gruppen(liste){
    var res=[];
    (Array.isArray(liste)?liste:[]).forEach(function(g){
      var roh=Array.isArray(g)?g:((g&&typeof g==="object"&&Array.isArray(g.members))?g.members:null);
      if(!roh){zaehle("gruppe");return;}
      if(res.length>=100){zaehle("limit");return;}
      var mem=[];
      roh.forEach(function(m){
        m=alsId(m);
        var n=(typeof m==="string")?stuMap[m]:null;
        if(!n){zaehle("verweis");return;}
        if(mem.indexOf(n)===-1)mem.push(n);
      });
      var stufe=(!Array.isArray(g)&&hasOwn(STUFEN,g.level))?g.level:"moderat";
      res.push({id:neueId(Array.isArray(g)?undefined:g.id,"g"),members:mem,level:stufe});
    });
    return res;
  }
  out.blacklist=gruppen(p.blacklist);
  out.whitelist=gruppen(p.whitelist);

  /* Optionen */
  var o=(p.options&&typeof p.options==="object")?p.options:{};
  out.options={
    gender:hasOwn({off:1,mix:1,split:1},o.gender)?o.gender:"off",
    level:hasOwn({off:1,hetero:1,homo:1},o.level)?o.level:"off",
    solo:o.solo==="all"?"all":"off",
    showNotes:(typeof o.showNotes==="boolean")?o.showNotes:(o.printNotes===true),
    showGender:o.showGender===true,
    showLevel:o.showLevel===true,
    nameFormat:hasOwn(NAMENSFORMATE,o.nameFormat)?o.nameFormat:"voll"
  };

  /* Raumvorlagen B und C */
  var tpl=(p.roomTemplates&&typeof p.roomTemplates==="object")?p.roomTemplates:{};
  out.roomTemplates={B:null,C:null};
  ["B","C"].forEach(function(k){
    var t=tpl[k];if(!t)return;
    if(typeof t!=="object"){zaehle("vorlage");return;}
    var fehler=0;
    var tc=ganzzahl(t.cols,4,24,14),tr=ganzzahl(t.rows,3,20,9);
    var r=raumObjekte(tc,tr,t.tables,t.furniture,function(){fehler++;},function(alt,pre){
      return(typeof alt==="string"&&ID_RE.test(alt)&&!RESERVIERT.test(alt))?alt:uid(pre);
    },null);
    if(fehler)zaehle("vorlage");
    out.roomTemplates[k]={name:kurztext(t.name,60)||("Vorlage "+k),cols:tc,rows:tr,tables:r.tables,furniture:r.furniture};
  });

  /* Passwortschutz */
  var sec=(p.security&&typeof p.security==="object")?p.security:{};
  var hash=(typeof sec.hash==="string"&&/^(?:[0-9a-f]{64}|s[0-9a-f]{1,8})$/.test(sec.hash))?sec.hash:null;
  if(sec.hash&&!hash)zaehle("passwort");
  var al=(sec.autolock&&typeof sec.autolock==="object")?sec.autolock:{};
  var min=ganzzahl(al.min,0,60,10);
  if([0,5,10,15,30].indexOf(min)===-1)min=10;
  out.security={hash:hash,autolock:{min:min,bg:al.bg!==false}};

  /* verständliche Hinweise zu allem, was bereinigt wurde */
  var T={
    raum:["Die Raumgröße lag außerhalb des erlaubten Bereichs und wurde angepasst."],
    tisch:["Ein Tisch war ungültig oder lag außerhalb des Raums und wurde entfernt.","# Tische waren ungültig oder lagen außerhalb des Raums und wurden entfernt."],
    moebel:["Ein Möbelstück war ungültig oder überlappte und wurde entfernt.","# Möbelstücke waren ungültig oder überlappten und wurden entfernt."],
    person:["Ein Eintrag der Klassenliste hatte keinen gültigen Namen und wurde entfernt.","# Einträge der Klassenliste hatten keinen gültigen Namen und wurden entfernt."],
    tag:["Ein ungültiges Platzmerkmal wurde entfernt.","# ungültige Platzmerkmale wurden entfernt."],
    farbe:["Eine ungültige Farbe wurde ersetzt.","# ungültige Farben wurden ersetzt."],
    verweis:["Ein Verweis auf eine nicht vorhandene Person, einen Platz oder ein Platzmerkmal wurde entfernt.","# Verweise auf nicht vorhandene Personen, Plätze oder Platzmerkmale wurden entfernt."],
    id:["Eine doppelte oder ungültige Kennung wurde neu vergeben.","# doppelte oder ungültige Kennungen wurden neu vergeben."],
    gruppe:["Eine ungültige Regelgruppe wurde entfernt.","# ungültige Regelgruppen wurden entfernt."],
    wert:["Ein ungültiger Wert (Geschlecht oder Leistungsstärke) wurde auf den Standard gesetzt.","# ungültige Werte (Geschlecht oder Leistungsstärke) wurden auf den Standard gesetzt."],
    vorlage:["Eine gespeicherte Raumvorlage war beschädigt und wurde bereinigt.","# gespeicherte Raumvorlagen waren beschädigt und wurden bereinigt."],
    passwort:["Das gespeicherte Passwort war ungültig; der Passwortschutz wurde entfernt."],
    limit:["Die Datei enthielt mehr Einträge als erlaubt; überzählige wurden weggelassen."],
    einrasten:["Ein um 90° gedrehter Tisch wurde genau ins Raster gesetzt (jetzt quer bzw. längs).","# um 90° gedrehte Tische wurden genau ins Raster gesetzt (jetzt quer bzw. längs)."]
  };
  reihenfolge.forEach(function(k){
    var n=z[k],t=T[k];
    H.push((n>1&&t[1])?t[1].replace("#",n):t[0]);
  });
  /* feste Reihenfolge der Felder, damit Sicherungen immer gleich aufgebaut sind */
  var fertig={};
  ["v","planName","room","tables","seatMeta","students","tags","blacklist","whitelist",
   "arrangement","options","roomTemplates","security"].forEach(function(k){fertig[k]=out[k];});
  return fertig;
}
