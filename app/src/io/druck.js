import { el, esc } from "../core/basis.js";
import { allSeats, drehFaktor, meta, seatKey, sitzMitte, tableCells, tischZellen } from "../core/geometrie.js";
import { DRUCK_KEY, DRUCK_PASSEND_KEY, GENDERS, LEVEL_TXT } from "../core/konstanten.js";
import { sName } from "../core/regeln.js";
import { reindex } from "../core/zustand.js";
import { sofortSichern } from "./speicher.js";
import { S } from "../store.js";
import { closeModal, openModal } from "../ui/modal.js";
import { boxCells, buildLayout, furnSpan, furniture, layoutPunkt, tx } from "../ui/plan-ansicht.js";
import { ic } from "../ui/symbole.js";

/* ===================== Drucken ===================== */
export function rawBounds(){
  var minx=null,maxx=null,miny=0,maxy=1;
  function mark(c){
    if(minx===null||c.x<minx)minx=c.x;
    if(maxx===null||c.x>maxx)maxx=c.x;
    if(c.y>maxy)maxy=c.y;
    if(c.y<miny)miny=c.y;
  }
  S.state.tables.forEach(function(t){tischZellen(t).forEach(mark);});
  furniture().forEach(function(f){boxCells("furniture",f,f.x,f.y).forEach(mark);});
  if(minx===null){minx=0;maxx=S.state.room.cols-1;}
  return{minx:minx,maxx:maxx,miny:miny,maxy:maxy};
}
/* Für den Ausdruck: nur Zeilen und Spalten, in denen wirklich etwas steht (kein Platz für leere Randzeilen) */
export function druckGrenzen(){
  var minx=null,maxx=null,miny=null,maxy=null;
  function mark(c){
    if(minx===null||c.x<minx)minx=c.x;
    if(maxx===null||c.x>maxx)maxx=c.x;
    if(miny===null||c.y<miny)miny=c.y;
    if(maxy===null||c.y>maxy)maxy=c.y;
  }
  S.state.tables.forEach(function(t){tischZellen(t).forEach(mark);});
  furniture().forEach(function(f){boxCells("furniture",f,f.x,f.y).forEach(mark);});
  if(minx===null){minx=0;maxx=S.state.room.cols-1;miny=0;maxy=1;}
  return{minx:minx,maxx:maxx,miny:miny,maxy:maxy};
}
export function boundsFor(mode,raw){
  if(mode==="student")return raw;
  return{
    minx:S.state.room.cols-1-raw.maxx, maxx:S.state.room.cols-1-raw.minx,
    miny:S.state.room.rows-1-raw.maxy, maxy:S.state.room.rows-1-raw.miny
  };
}
function fitMm(name,wMm,hMm,maxFs){
  if(!name)return maxFs;
  var usable=Math.max(1,wMm-2.2),fs,K=0.58;
  for(fs=maxFs;fs>=1.8;fs-=0.1){                       /* möglichst einzeilig */
    if(name.length*K*fs<=usable)return Math.round(fs*10)/10;
  }
  for(fs=maxFs;fs>=1.8;fs-=0.1){                       /* sonst mehrzeilig */
    var perLine=Math.max(1,Math.floor(usable/(fs*K)));
    if(Math.ceil(name.length/perLine)*fs*1.15<=hMm)return Math.round(fs*10)/10;
  }
  return 1.8;
}
/* Namen im Ausdruck: größte Schrift, bei der der Name einzeilig oder an Leerzeichen und
   Bindestrichen umbrochen (höchstens drei Zeilen) in das Feld passt. Wörter werden nie zerteilt. */
function fitName(name,wMm,hMm,maxFs){
  if(!name)return maxFs;
  var usable=Math.max(1,wMm-2.2),K=0.6,fs;
  var teile=String(name).match(/[^\s-]+-?|-/g)||[String(name)];
  for(fs=maxFs;fs>=1.8;fs-=0.1){
    var proZeile=usable/(fs*K),zeilen=1,akt=0,ok=true;
    for(var i=0;i<teile.length;i++){
      var t=teile[i],len=t.length;
      if(len>proZeile){ok=false;break;}
      var fuge=(akt>0&&!/-$/.test(teile[i-1]))?1:0;
      if(akt>0&&akt+fuge+len>proZeile){zeilen++;akt=len;}
      else akt+=fuge+len;
    }
    if(ok&&zeilen<=3&&zeilen*fs*1.14<=hMm)return Math.round(fs*10)/10;
  }
  return fitMm(name,wMm,hMm,maxFs);
}
/* Hinweise dürfen zweizeilig stehen – lieber umbrechen als winzig werden */
function fitNote(text,wMm,hMm,maxFs){
  var usable=Math.max(1,wMm-2.2),K=0.56,fs;
  for(fs=maxFs;fs>=1.6;fs-=0.1){
    var perLine=Math.max(1,Math.floor(usable/(fs*K)));
    var lines=Math.ceil(text.length/perLine);
    if(lines<=2&&lines*fs*1.18<=hMm)return Math.round(fs*10)/10;
  }
  return 1.6;
}
S.letzteKurzform=false;
function printViewHtml(mode,uw,uh,raw){
  var saved=S.view;S.view=mode;
  var bd=boundsFor(mode,raw);
  var L=buildLayout(bd,mode,true);
  function X(cx){return L.cx[cx-L.minx]*uw;}
  function Y(cy){return L.ry[cy-L.miny]*uh;}
  function CW(cx){return L.cw[cx-L.minx]*uw;}
  function CH(cy){return L.rw[cy-L.miny]*uh;}
  var html="";
  /* tatsächlich belegte Fläche in mm (für den Zuschnitt) */
  var ex={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};
  function erweitern(x0,y0,x1,y1){
    if(x0<ex.x0)ex.x0=x0;if(y0<ex.y0)ex.y0=y0;if(x1>ex.x1)ex.x1=x1;if(y1>ex.y1)ex.y1=y1;
  }

  /* Tafel, Lehrertisch und weitere Möbel */
  furniture().forEach(function(f){
    var sp=furnSpan(f,mode);
    var rowH=CH(sp.y);
    var GAP=Math.min(1.0,uw*0.04);
    var wmm=X(sp.r)+CW(sp.r)-X(sp.l)-2*GAP;
    var hmm=rowH*0.46;
    var fsz=Math.min(4.2,hmm*0.55,fitMm(f.label,wmm,hmm,4.2));
    erweitern(X(sp.l)+GAP,Y(sp.y)+rowH*0.27,X(sp.l)+GAP+wmm,Y(sp.y)+rowH*0.27+hmm);
    html+='<div class="'+(f.type==="board"?"pboard":"pdesk")+'" style="left:'+(X(sp.l)+GAP)+
          "mm;top:"+(Y(sp.y)+rowH*0.27)+"mm;width:"+wmm+"mm;height:"+hmm+"mm;font-size:"+
          fsz+'mm">'+esc(f.label)+"</div>";
  });

  /* Tische: direkt aneinandergestellte Tische bilden eine zusammenhängende Fläche.
     Jede Zelle zeichnet ihre rechte und untere Kante, die linke und obere nur am Rand. */
  var zellen=[],zset={},dreh=[];
  S.state.tables.forEach(function(t){
    if(t.winkel){
      for(var di=0;di<t.seats;di++){
        var mm=sitzMitte(t,di),lp=layoutPunkt(L,mm.x,mm.y,mode);
        dreh.push({t:t,i:di,cx:lp.x*uw,cy:lp.y*uh,w:t.winkel,inn:uw/drehFaktor(t.winkel)});
      }
      return;
    }
    tableCells(t).forEach(function(c,i){var q=tx(c.x,c.y);zellen.push({t:t,i:i,x:q.x,y:q.y});zset[q.x+","+q.y]=1;});
  });
  var RANDX=0,THICK=1;                       /* jeder Platz ist ein Quadrat */
  zellen.forEach(function(z){
    z.l=!zset[(z.x-1)+","+z.y];z.r=!zset[(z.x+1)+","+z.y];z.o=!zset[z.x+","+(z.y-1)];z.u=!zset[z.x+","+(z.y+1)];
    var cw=CW(z.x),ch=CH(z.y),iy=ch*(1-THICK)/2;
    z.x0=X(z.x)+(z.l?RANDX:0);z.x1=X(z.x)+cw-(z.r?RANDX:0);
    z.y0=Y(z.y)+(z.o?iy:0);z.y1=Y(z.y)+ch-(z.u?iy:0);
  });
  var nameFs=Math.min(8.5,uw*0.28,uh*0.42);
  var subFs=Math.min(3.4,uw*0.15,uh*0.2);
  /* Einheitliches Raster: gleiche Bandhöhen und eine gemeinsame Schriftgröße
     für alle Plätze, damit die Namen auf einer Höhe stehen. */
  var minSh=Infinity,minSw=Infinity;
  zellen.forEach(function(z){minSw=Math.min(minSw,z.x1-z.x0);minSh=Math.min(minSh,z.y1-z.y0);});
  dreh.forEach(function(z){minSw=Math.min(minSw,z.inn);minSh=Math.min(minSh,z.inn);});
  if(!isFinite(minSh)){minSh=10;minSw=10;}
  var pSub=(mode==="teacher")&&(S.state.options.showGender||S.state.options.showLevel);
  var pNote=(mode==="teacher")&&S.state.options.showNotes&&allSeats().some(function(s){
    var sid=S.state.arrangement[s.key];
    return !s.m.blocked&&sid&&S.STU[sid]&&S.STU[sid].note;
  });
  var pSubH=pSub?subFs*1.3:0;
  var pNoteH=pNote?Math.min(minSh*0.32,subFs*2.6):0;
  var pBandH=Math.max(2,minSh-1-pSubH-pNoteH);
  function pTeile(stu,kurz){
    var teile=[];
    if(S.state.options.showGender&&stu.gender!=="x")
      teile.push(kurz?GENDERS[stu.gender].short:GENDERS[stu.gender].label);
    if(S.state.options.showLevel)teile.push(LEVEL_TXT[stu.level]);
    return teile.join(" · ");
  }
  var pLangFs=subFs;
  if(pSub)allSeats().forEach(function(s){
    var sid=S.state.arrangement[s.key];
    if(s.m.blocked||!sid||!S.STU[sid])return;
    var t=pTeile(S.STU[sid],false);
    if(t)pLangFs=Math.min(pLangFs,fitMm(t,minSw,pSubH,subFs));
  });
  var pKurz=pLangFs<subFs*0.8;
  if(mode==="teacher")S.letzteKurzform=pKurz;
  var pFs=nameFs, pSubFs=subFs, pNoteFs=subFs*1.1;
  allSeats().forEach(function(s){
    var sid=S.state.arrangement[s.key];
    if(s.m.blocked||!sid)return;
    pFs=Math.min(pFs,fitName(sName(sid),minSw,pBandH,nameFs));
    var stu=S.STU[sid];if(!stu)return;
    if(mode==="teacher"){
      var t2=pTeile(stu,pKurz);
      if(t2)pSubFs=Math.min(pSubFs,fitMm(t2,minSw,pSubH,subFs));
      if(S.state.options.showNotes&&stu.note)
        pNoteFs=Math.min(pNoteFs,fitNote(stu.note,minSw,Math.max(2,pNoteH-0.9),subFs*1.1));
    }
  });
  /* Namen stehen immer deutlich größer als Hinweise und Zusatzzeile */
  pNoteFs=Math.min(pNoteFs,Math.floor(pFs*0.72*10)/10);
  pSubFs=Math.min(pSubFs,Math.floor(pFs*0.8*10)/10);
  function inhalt(key){
    var m=meta(key),sid=S.state.arrangement[key];
    var inner="";
    if(!m.blocked){
      /* Platzmerkmale sind reine Planungshilfe und werden nie gedruckt */
      var extra=[],hinweis="";
      if(mode==="teacher"&&sid&&S.STU[sid]){
        var stu=S.STU[sid];
        var t3=pTeile(stu,pKurz);
        if(t3)extra.push(t3);
        if(S.state.options.showNotes&&stu.note)hinweis=stu.note;
      }
      inner+='<div class="n" style="height:'+pBandH+"mm;font-size:"+pFs+'mm">'+(sid?esc(sName(sid)):"")+"</div>";
      if(pNote)inner+='<div class="hw" style="height:'+pNoteH+"mm;font-size:"+pNoteFs+'mm">'+esc(hinweis)+"</div>";
      if(pSub)inner+='<div class="t" style="height:'+pSubH+"mm;font-size:"+pSubFs+'mm">'+esc(extra.join(" · "))+"</div>";
    }
    return inner;
  }
  zellen.forEach(function(z){
    var key=seatKey(z.t.id,z.i),m=meta(key);
    var cls="pseat bR bU"+(z.l?" bL":"")+(z.o?" bO":"")+(m.blocked?" blk":"");
    erweitern(z.x0,z.y0,z.x1,z.y1);
    html+='<div class="'+cls+'" style="left:'+z.x0+"mm;top:"+z.y0+"mm;width:"+(z.x1-z.x0)+"mm;height:"+(z.y1-z.y0)+'mm">'+inhalt(key)+"</div>";
  });
  /* gedrehte Tische: quadratische Plätze, gedreht; der Text steht waagrecht in der Mitte */
  dreh.forEach(function(z){
    var key=seatKey(z.t.id,z.i),m=meta(key),u=uw,quer=z.t.dir!=="v";
    var halb=u*drehFaktor(z.w)/2;                            /* Hälfte der Breite des gedrehten Quadrats */
    erweitern(z.cx-halb,z.cy-halb,z.cx+halb,z.cy+halb);
    var randPlatz=mode==="teacher"?z.t.seats-1:0;           /* in der Lehrersicht ist die Reihenfolge gespiegelt */
    var cls="pseat rot bR bU"+(quer?" bO":" bL")+(z.i===randPlatz?(quer?" bL":" bO"):"")+(m.blocked?" blk":"");
    html+='<div class="'+cls+'" style="left:'+(z.cx-u/2)+"mm;top:"+(z.cy-u/2)+"mm;width:"+u+"mm;height:"+u+"mm;transform:rotate("+z.w+'deg)">'+
      '<div class="pdreh" style="left:'+((u-z.inn)/2)+"mm;top:"+((u-z.inn)/2)+"mm;width:"+z.inn+"mm;height:"+z.inn+"mm;transform:rotate("+(-z.w)+'deg)">'+
      inhalt(key)+"</div></div>";
  });
  S.view=saved;
  var rand=0.2;                                /* Linienstärke der Ränder mitnehmen */
  if(!isFinite(ex.x0)){ex={x0:0,y0:0,x1:L.totalW*uw,y1:L.totalH*uh};rand=0;}
  var w=ex.x1-ex.x0+2*rand,h=ex.y1-ex.y0+2*rand;
  html='<div class="proom" style="width:'+w+"mm;height:"+h+'mm"><div class="pinner" style="left:'+(rand-ex.x0)+"mm;top:"+(rand-ex.y0)+
       "mm;width:"+(L.totalW*uw)+"mm;height:"+(L.totalH*uh)+'mm">'+html+"</div></div>";
  return{html:html,w:w,h:h};
}
/* Seitenrand ringsum (mm). Überschrift und Datum stehen im Rand, der Plan füllt den Rest. */
var DRUCKRAND=12;
var DRUCK_MAX=70;                            /* größte Kantenlänge eines Platzes (mm) */
function preparePrint(wahl,passend){
  wahl=(wahl==="lehrer"||wahl==="schueler")?wahl:"beide";
  reindex();
  var raw=druckGrenzen();
  /* Zuschnitt auf die gezeichnete Fläche: einmal mit 10 mm je Einheit ausmessen, daraus die Größe bestimmen */
  var mess=printViewHtml("student",10,10,raw);
  function einheit(pw,ph){return Math.min((pw-2*DRUCKRAND)/mess.w,(ph-2*DRUCKRAND-0.4)/mess.h)*10;}
  var uQuer=einheit(297,210),uHoch=einheit(210,297);
  /* Querformat bevorzugen; Hochformat nur, wenn der Plan dort deutlich größer wird */
  var landscape=!(uHoch>uQuer*1.1);
  var pw=landscape?297:210,ph=landscape?210:297;
  var availW=pw-2*DRUCKRAND,availH=ph-2*DRUCKRAND-0.4;
  var u=Math.min(landscape?uQuer:uHoch,DRUCK_MAX);
  /* Feinabgleich: Abstände zwischen Feldern wachsen nicht ganz gleichmäßig mit */
  for(var i=0;i<4;i++){
    var t=printViewHtml("student",u,u,raw);
    var k=Math.min(availW/t.w,availH/t.h);
    if(k<1)u*=k*0.9995;
    else if(u<DRUCK_MAX&&k>1.002)u=Math.min(DRUCK_MAX,u*k*0.9995);
    else break;
  }
  var ansichtL=wahl!=="schueler"?printViewHtml("teacher",u,u,raw):null;
  var ansichtS=wahl!=="lehrer"?printViewHtml("student",u,u,raw):null;
  /* Seite = Plan plus Rand: dann sind alle vier Ränder genau gleich (gedacht für PDF) */
  var seiteB=availW,seiteH=availH;
  if(passend){
    seiteB=Math.max(ansichtL?ansichtL.w:0,ansichtS?ansichtS.w:0);
    seiteH=Math.max(ansichtL?ansichtL.h:0,ansichtS?ansichtS.h:0);
  }
  var seitenGroesse=passend?(seiteB+2*DRUCKRAND).toFixed(2)+"mm "+(seiteH+2*DRUCKRAND+0.2).toFixed(2)+"mm":"A4 "+(landscape?"landscape":"portrait");
  var st=el("printPageStyle");
  if(!st){st=document.createElement("style");st.id="printPageStyle";document.head.appendChild(st);}
  st.textContent="@media print{@page{size:"+seitenGroesse+";margin:"+DRUCKRAND+"mm}}";
  var date=new Date().toLocaleDateString("de-DE");
  var extra=S.state.options.showLevel?"Leistungsstärke: stark · mittel · Unterstützung":"";
  var titel=esc(S.state.planName||"Sitzplan");
  var seite='<div class="pp" style="width:'+seiteB+"mm;height:"+seiteH+'mm">';
  var out="";
  if(wahl!=="schueler")
  out+=seite+'<div class="head">'+titel+
       " &middot; Lehrersicht (Blick von der Tafel in die Klasse) &middot; "+date+'</div><div class="pbox">'+
       ansichtL.html+"</div>"+
       (extra?'<div class="plegend">'+esc(extra)+"</div>":"")+"</div>";
  if(wahl!=="lehrer")
  out+=seite+'<div class="head">'+titel+
       " &middot; Schülersicht (Blick nach vorn zur Tafel) &middot; "+date+'</div><div class="pbox">'+
       ansichtS.html+"</div></div>";
  el("printSheet").innerHTML=out;
}

/* ===================== Drucken ===================== */
S.druckBereit=false;
/* Die eingebaute Druckschrift wird gleich beim Start geladen, damit auch Strg+P sie sofort hat. */
S.druckSchrift=null;
function druckSchriftLaden(){
  if(S.druckSchrift)return S.druckSchrift;
  try{
    if(document.fonts&&document.fonts.load&&window.Promise){
      S.druckSchrift=Promise.all([document.fonts.load('400 16px "Sitzplan Gothic"',"Aä"),document.fonts.load('700 16px "Sitzplan Gothic"',"Aä")]);
      S.druckSchrift.catch(function(){});
    }
  }catch(e){S.druckSchrift=null;}
  return S.druckSchrift;
}
druckSchriftLaden();
function druckWahl(){
  var w=null;try{w=localStorage.getItem(DRUCK_KEY);}catch(e){}
  return(w==="lehrer"||w==="schueler")?w:"beide";
}
function druckPassend(){
  try{return localStorage.getItem(DRUCK_PASSEND_KEY)==="1";}catch(e){return false;}
}
function drucken(wahl){
  var los=function(){
    preparePrint(wahl,druckPassend());S.druckBereit=true;
    setTimeout(function(){
      try{window.print();}finally{S.druckBereit=false;}
    },80);
  };
  var sch=druckSchriftLaden();
  if(!sch){los();return;}
  /* höchstens 1,5 s auf die Schrift warten – danach wird trotzdem gedruckt */
  var fertig=false,einmal=function(){if(!fertig){fertig=true;los();}};
  sch.then(einmal,einmal);setTimeout(einmal,1500);
}
export function druckDialog(){
  if(S.beamer){drucken("schueler");return;}
  sofortSichern();
  var w=druckWahl();
  var sens=[];
  if(S.state.options.showNotes)sens.push("Hinweise");
  if(S.state.options.showGender)sens.push("Geschlecht");
  if(S.state.options.showLevel)sens.push("Leistungsstärke");
  openModal(function(b){
    function wahlZeile(wert,text,sub){
      return '<label><input type="radio" name="drWahl" value="'+wert+'"'+(w===wert?" checked":"")+"><span>"+text+"<small>"+sub+"</small></span></label>";
    }
    b.innerHTML="<h3>Drucken</h3>"+
      '<p class="hint">Jede Sicht kommt – auf die genutzte Fläche zugeschnitten und so groß wie möglich – auf eine eigene A4-Seite, meist im Querformat. Ein PDF entsteht im Druckfenster über „Als PDF speichern“.</p>'+
      '<div class="radiocards" role="radiogroup" aria-label="Was soll gedruckt werden?" style="margin:12px 0">'+
        wahlZeile("beide","Lehrer- und Schülersicht","2 Seiten")+
        wahlZeile("lehrer","nur Lehrersicht","für dich – mit eingeschalteten Zusatzangaben")+
        wahlZeile("schueler","nur Schülersicht","nur Namen – zum Aushängen")+"</div>"+
      '<label class="check" style="margin:0 0 10px"><input type="checkbox" id="drPassend"'+(druckPassend()?" checked":"")+'><span>Seitengröße an den Plan anpassen (für PDF)'+
        '<small>Die Seite wird so groß wie der Plan plus Rand – alle vier Ränder sind gleich. Zum Drucken auf Papier lieber ausschalten; Safari auf dem iPad kann die Seitengröße ignorieren.</small></span></label>'+
      '<div class="callout plain" id="drBox"><span id="drInfo" aria-live="polite"></span></div>'+
      '<div class="modal-actions"><button type="button" id="drAbbr" class="btn">Abbrechen</button>'+
      '<button type="button" id="drGo" class="btn primary">'+ic("print")+"Drucken</button></div>";
    function gewaehlt(){var r=b.querySelector('input[name="drWahl"]:checked');return r?r.value:"beide";}
    function info(){
      var g=gewaehlt(),t,warn=false;
      if(g==="schueler")t="Die Schülersicht enthält nur Namen – geeignet zum Aushängen.";
      else if(sens.length){t="Achtung: Die Lehrersicht enthält "+sens.join(", ")+". Nicht aushängen.";warn=true;}
      else t="Gedruckt werden nur Namen. Hinweise, Geschlecht und Leistungsstärke sind ausgeschaltet.";
      el("drInfo").textContent=t;
      el("drBox").className="callout "+(warn?"warn":"plain");
    }
    b.querySelectorAll('input[name="drWahl"]').forEach(function(r){r.onchange=info;});
    info();
    el("drAbbr").onclick=closeModal;
    el("drGo").onclick=function(){
      var g=gewaehlt();
      try{localStorage.setItem(DRUCK_KEY,g);localStorage.setItem(DRUCK_PASSEND_KEY,el("drPassend").checked?"1":"0");}catch(e){}
      closeModal();drucken(g);
    };
  });
}
/* Auch Strg+P druckt ein vollständiges Blatt – im Beamer-Modus nur die Schülersicht */
window.addEventListener("beforeprint",function(){
  if(!S.druckBereit)preparePrint(S.beamer?"schueler":druckWahl(),druckPassend());
});
