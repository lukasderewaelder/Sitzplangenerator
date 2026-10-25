import { el, esc } from "../core/basis.js";
import { EINZUG, allSeats, buildAdj, drehFaktor, imRaum, polyUeberlappen, rechteckForm, tableCells, tischForm, tischMasse, tischZellen } from "../core/geometrie.js";
import { GENDERS, LEVEL_TXT } from "../core/konstanten.js";
import { sName, tagById } from "../core/regeln.js";
import { evaluate } from "../core/solver.js";
import { boundsFor, rawBounds } from "../io/druck.js";
import { S } from "../store.js";
import { schmal } from "./plan-status.js";
import { ic } from "./symbole.js";
import { zoomWert } from "./zoom.js";

/* ===================== Ansicht / Koordinaten ===================== */
function txMode(x,y,mode){
  if(mode==="student")return{x:x,y:y};
  return{x:S.state.room.cols-1-x,y:S.state.room.rows-1-y};
}
export function tx(x,y){return txMode(x,y,S.view);}
/* Sitzbereich: über welche Spalten sich die Tische erstrecken */
function seatSpan(){
  var mn=null,mx=null;
  S.state.tables.forEach(function(t){
    tischZellen(t).forEach(function(c){
      if(mn===null||c.x<mn)mn=c.x;
      if(mx===null||c.x>mx)mx=c.x;
    });
  });
  if(mn===null){mn=0;mx=S.state.room.cols-1;}
  return{mn:mn,mx:mx,span:mx-mn+1};
}
/* Möbel (Tafel, Lehrertisch …): frei platzierbar, Beschriftung änderbar */
export function furniture(){return S.state.room.furniture||(S.state.room.furniture=[]);}
export function boxCells(kind,o,x,y){
  var out=[],i;
  if(kind==="table"){
    for(i=0;i<o.seats;i++)out.push(o.dir==="h"?{x:x+i,y:y}:{x:x,y:y+i});
  }else{
    for(i=0;i<o.w;i++)out.push({x:x+i,y:y});
  }
  return out;
}
export function fitsBox(kind,o,x,y){
  if(x<0||y<0)return false;
  if(kind==="table"&&o.winkel)return imRaum(tischForm(o,x,y,0.02),S.state.room.cols,S.state.room.rows);
  return boxCells(kind,o,x,y).every(function(c){
    return c.x<S.state.room.cols&&c.y<S.state.room.rows;
  });
}
export function collides(kind,o,x,y){
  /* Rasterfelder genügen, solange nichts gedreht ist – sonst genaue Formen vergleichen */
  var ich=(kind==="table"&&o.winkel)?tischForm(o,x,y,EINZUG):null,form=null;
  var set={},hit=false;
  boxCells(kind,o,x,y).forEach(function(c){set[c.x+","+c.y]=1;});
  function meine(){
    if(!form)form=ich||(kind==="table"?tischForm(o,x,y,EINZUG):rechteckForm(x,y,o.w,1,EINZUG));
    return form;
  }
  S.state.tables.forEach(function(t){
    if(hit||(kind==="table"&&t.id===o.id))return;
    if(!ich&&!t.winkel)tableCells(t).forEach(function(c){if(set[c.x+","+c.y])hit=true;});
    else if(polyUeberlappen(meine(),tischForm(t,t.x,t.y,EINZUG)))hit=true;
  });
  furniture().forEach(function(f){
    if(hit||(kind==="furniture"&&f.id===o.id))return;
    if(!ich)boxCells("furniture",f,f.x,f.y).forEach(function(c){if(set[c.x+","+c.y])hit=true;});
    else if(polyUeberlappen(ich,rechteckForm(f.x,f.y,f.w,1,EINZUG)))hit=true;
  });
  return hit;
}
/* Wrapper für Tische (wird an mehreren Stellen genutzt) */
export function fits(t,x,y){return fitsBox("table",t,x,y);}
export function overlaps(t,x,y){return collides("table",t,x,y);}
export function furnSpan(f,mode){
  var cs=boxCells("furniture",f,f.x,f.y).map(function(c){return txMode(c.x,c.y,mode);});
  var xs=cs.map(function(c){return c.x;});
  return{l:Math.min.apply(null,xs),r:Math.max.apply(null,xs),y:cs[0].y};
}

/* Belegte Spalten/Reihen bekommen volle Breite, leere (Gänge) nur einen Bruchteil.
   Dadurch werden die Tische groß und die Gänge schmal. */
var AISLE_C=0.38, AISLE_R=0.32, BOARD_R=0.8, FURN_C=0.55;
export function buildLayout(bd,mode,druck){
  var AC=druck?0.3:AISLE_C,AR=druck?0.25:AISLE_R;
  var occC={},occR={},furC={},furR={},i;
  S.state.tables.forEach(function(t){
    tischZellen(t).forEach(function(c){var q=txMode(c.x,c.y,mode);occC[q.x]=1;occR[q.y]=1;});
  });
  furniture().forEach(function(f){
    boxCells("furniture",f,f.x,f.y).forEach(function(c){
      var q=txMode(c.x,c.y,mode);furC[q.x]=1;furR[q.y]=1;
    });
  });
  var cw=[],rw=[];
  for(i=bd.minx;i<=bd.maxx;i++)cw.push(occC[i]?1:(furC[i]?FURN_C:AC));
  for(i=bd.miny;i<=bd.maxy;i++)rw.push(occR[i]?1:(furR[i]?BOARD_R:AR));
  var cx=[],ry=[],acc=0;
  for(i=0;i<cw.length;i++){cx.push(acc);acc+=cw[i];}
  var totalW=acc;acc=0;
  for(i=0;i<rw.length;i++){ry.push(acc);acc+=rw[i];}
  return{cw:cw,rw:rw,cx:cx,ry:ry,minx:bd.minx,miny:bd.miny,totalW:totalW,totalH:acc};
}
/* Punkt in Raumkoordinaten (Felder, auch Bruchteile) → Lage im gezeichneten Plan (Einheiten) */
export function layoutPunkt(L,fx,fy,mode){
  var q=mode==="student"?{x:fx,y:fy}:{x:S.state.room.cols-fx,y:S.state.room.rows-fy};
  function achse(v,min,w,pos){
    var i=Math.floor(v)-min;
    if(i<0)return pos[0]+(v-min)*w[0];
    if(i>=w.length)i=w.length-1;
    return pos[i]+(v-(i+min))*w[i];
  }
  return{x:achse(q.x,L.minx,L.cw,L.cx),y:achse(q.y,L.miny,L.rw,L.ry)};
}
function fitFont(name,wPx,hPx,maxFs){
  if(!name)return 12;
  var K=0.57,mx=maxFs||17,fs;                      /* mittlere Zeichenbreite bei fetter Schrift */
  /* bevorzugt an Leerzeichen und nach Bindestrichen umbrechen, nicht mitten im Wort */
  var teile=String(name).replace(/-/g,"-\u0001").split(/[\s\u0001]+/).filter(Boolean);
  for(fs=mx;fs>=8;fs--){
    var proZeile=wPx/(fs*K);
    if(teile.some(function(t){return t.length>proZeile;}))continue;
    var zeilen=1,len=0;
    teile.forEach(function(t){var add=(len?1:0)+t.length;if(len&&len+add>proZeile){zeilen++;len=t.length;}else len+=add;});
    if(zeilen<=3&&zeilen*fs*1.18<=hPx)return fs;
  }
  for(fs=mx;fs>=7;fs--){                          /* sonst notfalls im Wort umbrechen */
    var perLine=Math.max(1,Math.floor(wPx/(fs*K)));
    if(Math.ceil(name.length/perLine)*fs*1.2<=hPx)return fs;
  }
  return 7;
}
S.letzteBewertung=null;
S.raumFokus=null;
S.hervor=null;
export function renderRoom(){
  var box=el("room");
  var akt=document.activeElement;
  var fokusK=S.raumFokus||((akt&&akt.classList&&akt.classList.contains("seat")&&box.contains(akt))?akt.dataset.k:null);
  S.raumFokus=null;
  var raw=rawBounds();
  var bd=boundsFor(S.view,raw);
  var L=buildLayout(bd,S.view);
  /* Einpassen in die Arbeitsfläche; der Zoom vergrößert oder verkleinert nur die Darstellung */
  var stg=el("stage"),sr=stg?stg.getBoundingClientRect():{width:0,height:0};
  var aw=Math.max(220,sr.width-32-20),ah=Math.max(160,sr.height-28-20);
  var zf=zoomWert("plan"),passend=Math.min(aw/L.totalW,ah/L.totalH);
  var unit=Math.floor(Math.max(zf<1?26:(schmal(799)?34:44),Math.min(S.beamer?230:150,passend*zf)));
  var tight=unit<58;
  var pad=8;
  function X(cx){return pad+L.cx[cx-L.minx]*unit;}
  function Y(cy){return pad+L.ry[cy-L.miny]*unit;}
  function CW(cx){return L.cw[cx-L.minx]*unit;}
  function CH(cy){return L.rw[cy-L.miny]*unit;}
  function PT(fx,fy){var q=layoutPunkt(L,fx,fy,S.view);return{x:pad+q.x*unit,y:pad+q.y*unit};}
  box.style.width=(L.totalW*unit+2*pad)+"px";
  box.style.height=(L.totalH*unit+2*pad)+"px";
  box.innerHTML="";

  /* Tafel, Lehrertisch und weitere Möbel */
  furniture().forEach(function(f){
    var sp=furnSpan(f,S.view);
    var rowH=CH(sp.y);
    var d=document.createElement("div");
    d.className=(f.type==="board")?"board":"deskmark";
    d.style.left=(X(sp.l)+2)+"px";
    d.style.top=(Y(sp.y)+rowH*0.26)+"px";
    d.style.width=(X(sp.r)+CW(sp.r)-X(sp.l)-4)+"px";
    d.style.height=(rowH*0.48)+"px";
    d.textContent=f.label;
    d.title=f.label;
    box.appendChild(d);
  });

  /* Tischflächen – direkt aneinandergestellte Tische verschmelzen zu einer Fläche */
  var tz={};
  S.state.tables.forEach(function(t){if(t.winkel)return;tableCells(t).forEach(function(c){var q=tx(c.x,c.y);tz[q.x+","+q.y]=1;});});
  var rad=Math.max(6,Math.min(12,Math.round(unit*0.12)));
  /* gedrehte Tische: eigene, gedrehte Fläche */
  S.state.tables.forEach(function(t){
    if(!t.winkel)return;
    var m=tischMasse(t),mp=PT(t.x+m.w/2,t.y+m.h/2),bw=m.w*unit-2,bh=m.h*unit-2;
    var d=document.createElement("div");d.className="tbl rot";
    d.style.left=(mp.x-bw/2)+"px";d.style.top=(mp.y-bh/2)+"px";d.style.width=bw+"px";d.style.height=bh+"px";
    d.style.borderWidth="1px";d.style.borderRadius=rad+"px";d.style.transform="rotate("+t.winkel+"deg)";
    box.appendChild(d);
  });
  Object.keys(tz).forEach(function(sch){
    var p=sch.split(","),x=+p[0],y=+p[1];
    var l=!tz[(x-1)+","+y],r=!tz[(x+1)+","+y],o=!tz[x+","+(y-1)],u=!tz[x+","+(y+1)];
    var x0=Math.round(X(x)+(l?1:0)),y0=Math.round(Y(y)+(o?1:0));
    var x1=Math.round(X(x)+CW(x)-(r?1:0)),y1=Math.round(Y(y)+CH(y)-(u?1:0));
    var d=document.createElement("div");d.className="tbl";
    d.style.left=x0+"px";d.style.top=y0+"px";d.style.width=(x1-x0)+"px";d.style.height=(y1-y0)+"px";
    d.style.borderWidth=(o?1:0)+"px "+(r?1:0)+"px "+(u?1:0)+"px "+(l?1:0)+"px";
    d.style.borderRadius=(o&&l?rad:0)+"px "+(o&&r?rad:0)+"px "+(u&&r?rad:0)+"px "+(u&&l?rad:0)+"px";
    box.appendChild(d);
  });

  /* Plätze */
  var seats=allSeats();
  var usable=seats.filter(function(s){return !s.m.blocked;});
  var res=evaluate(S.state.arrangement,usable,buildAdj(usable));
  S.letzteBewertung=res;
  var tischNr={};S.state.tables.forEach(function(t,i){tischNr[t.id]=i+1;});
  var leuchten=(S.hervor&&Date.now()<S.hervor.bis)?S.hervor.ids:[];
  var bad={},warn={},solo={};
  if(!S.beamer)res.issues.forEach(function(i){
    if(i.type==="black"){bad[i.a]=1;bad[i.b]=1;}
    if(i.type==="solo")solo[i.a]=1;
    if(i.type==="white"||i.type==="tag"||i.type==="lehrer")warn[i.a]=1;
  });

  /* Einheitliches Raster in jedem Platz: die Bereiche für Name, Zusatzzeile und
     Hinweis sind für alle Plätze gleich hoch, damit die Namen auf einer Höhe stehen. */
  var ins=tight?3:5;
  var hSeat=Infinity, wSeat=Infinity, drehInn=Infinity;
  seats.forEach(function(s){
    /* gedrehte Plätze bekommen eine eigene Einteilung, damit sie nicht alle Namen verkleinern */
    if(s.w){drehInn=Math.min(drehInn,(unit-2*ins)/drehFaktor(s.w));return;}
    var q=tx(s.x,s.y);
    hSeat=Math.min(hSeat,CH(q.y)-2*ins);
    wSeat=Math.min(wSeat,CW(q.x)-2*ins);
  });
  if(!isFinite(hSeat)){if(isFinite(drehInn)){hSeat=drehInn;wSeat=drehInn;}else{hSeat=40;wSeat=40;}}
  var lehrer=(S.view==="teacher");
  var subAktiv=lehrer&&!tight&&(S.state.options.showGender||S.state.options.showLevel)&&hSeat>=62;
  var notizDa=lehrer&&S.state.options.showNotes&&seats.some(function(s){
    var sid=S.state.arrangement[s.key];
    return !s.m.blocked&&sid&&S.STU[sid]&&S.STU[sid].note;
  });
  var notizAktiv=notizDa&&!tight&&hSeat>=70;
  var subH=subAktiv?13:0;
  var notizH=notizAktiv?Math.min(26,Math.round(hSeat*0.26)):0;
  var metaH=tight?0:15;
  var bandH=Math.max(14,hSeat-8-subH-notizH-metaH);
  /* eine gemeinsame Schriftgröße, damit kein Name aus der Reihe fällt */
  var maxFs=S.beamer?Math.max(18,Math.min(34,Math.round(unit/4.2))):Math.max(15,Math.min(19,Math.round(unit/5.2)));
  var gemeinsam=maxFs;
  seats.forEach(function(s){
    var sid=S.state.arrangement[s.key];
    if(s.w||s.m.blocked||!sid)return;
    gemeinsam=Math.min(gemeinsam,fitFont(sName(sid),wSeat-10,bandH,maxFs));
  });
  /* gedrehte Tische: kleinere Innenfläche (der Text steht waagrecht) – eine Größe je Tisch,
     nie größer als die übrigen Namen */
  var R={};
  seats.forEach(function(s){
    if(!s.w)return;
    var r=R[s.tid];
    if(!r){
      var inn=(unit-2*ins)/drehFaktor(s.w);
      r=R[s.tid]={sub:subAktiv&&inn>=62,notiz:notizAktiv&&inn>=70,fs:gemeinsam};
      r.subH=r.sub?13:0;r.notizH=r.notiz?Math.min(26,Math.round(inn*0.26)):0;
      r.band=Math.max(14,inn-8-r.subH-r.notizH-metaH);r.inn=inn;
    }
    var sid=S.state.arrangement[s.key];
    if(!s.m.blocked&&sid)r.fs=Math.min(r.fs,fitFont(sName(sid),r.inn-10,r.band,maxFs));
  });
  /* Zusatz- und Hinweiszeile: eine Größe, die den längsten Text aufnimmt */
  function zeilenFs(texte,breite,max){
    var fs=max;
    texte.forEach(function(t){
      if(!t)return;
      while(fs>7&&t.length*0.56*fs>breite)fs--;
    });
    return fs;
  }
  function subTeile(stu,kurz){
    var teile=[];
    if(S.state.options.showGender&&stu.gender!=="x")
      teile.push(kurz?GENDERS[stu.gender].short:GENDERS[stu.gender].label);
    if(S.state.options.showLevel)teile.push(LEVEL_TXT[stu.level]);
    return teile.join(" · ");
  }
  var lang=[],kurz=[],noteTexte=[];
  seats.forEach(function(s){
    var sid=S.state.arrangement[s.key];
    if(s.m.blocked||!sid||!S.STU[sid])return;
    var stu=S.STU[sid];
    var l=subTeile(stu,false);if(l)lang.push(l);
    var k=subTeile(stu,true);if(k)kurz.push(k);
    if(stu.note)noteTexte.push(stu.note);
  });
  /* Langform nur, wenn sie noch lesbar bleibt – sonst w/m/d */
  var subKurz=zeilenFs(lang,wSeat-20,10)<9;
  var subFsPx=zeilenFs(subKurz?kurz:lang,wSeat-20,10);
  var noteFsPx=zeilenFs(noteTexte,wSeat-12,10);

  seats.forEach(function(s){
    var p=tx(s.x,s.y);
    var d=document.createElement("div");
    d.className="seat";d.dataset.k=s.key;
    var drehAuf="",drehZu="";
    if(s.w){
      /* gedrehter Platz: die Kachel dreht sich mit, der Text bleibt waagrecht */
      var mp=PT(s.fx,s.fy),sz=unit-2*ins,inn=sz/drehFaktor(s.w),off=(sz-inn)/2-1.5;
      d.className+=" rot";
      d.style.left=(mp.x-sz/2)+"px";d.style.top=(mp.y-sz/2)+"px";
      d.style.width=sz+"px";d.style.height=sz+"px";
      d.style.transform="rotate("+s.w+"deg)";
      drehAuf='<div class="sdreh" style="left:'+off+"px;top:"+off+"px;width:"+inn+"px;height:"+inn+"px;transform:rotate("+(-s.w)+'deg)">';
      drehZu="</div>";
    }else{
      var w=CW(p.x)-2*ins, h=CH(p.y)-2*ins;
      d.style.left=(X(p.x)+ins)+"px";d.style.top=(Y(p.y)+ins)+"px";
      d.style.width=w+"px";d.style.height=h+"px";
    }
    if(s.m.blocked){
      d.className+=" blocked";d.setAttribute("role","img");
      d.setAttribute("aria-label","gesperrter Platz, Tisch "+tischNr[s.tid]+", Platz "+(s.idx+1));
      d.innerHTML=drehAuf+ic("ban")+drehZu;box.appendChild(d);return;
    }
    var sid=S.state.arrangement[s.key];
    var gewaehlt=!!(S.selected&&S.selected.kind==="seat"&&S.selected.key===s.key);
    if(gewaehlt)d.className+=" sel";
    if(sid&&leuchten.indexOf(sid)!==-1)d.className+=" flash";
    d.tabIndex=0;d.setAttribute("role","button");
    d.setAttribute("aria-pressed",gewaehlt?"true":"false");
    d.setAttribute("aria-label",(sid?sName(sid):"freier Platz")+", Tisch "+tischNr[s.tid]+", Platz "+(s.idx+1)+
      (s.m.locked?", fixiert":"")+((sid&&(bad[sid]||solo[sid]||warn[sid]))?", Regel nicht erfüllt":""));
    if(sid&&bad[sid])d.className+=" vb";
    if(sid&&solo[sid])d.className+=" vs";
    if(sid&&warn[sid])d.className+=" vw";
    var nm=sid?sName(sid):"";
    var mh="",stripe="",tnames=[];
    (S.beamer?[]:(s.m.tags||[])).forEach(function(tid){
      var t=tagById(tid);
      if(t){stripe+='<span style="background:'+t.color+'"></span>';tnames.push(t.name);}
    });
    if(stripe){
      d.className+=" hasTag";
      stripe='<div class="stripe" title="'+esc(tnames.join(", "))+'">'+stripe+"</div>";
    }
    /* Geschlecht und Leistungsstärke nur, wenn sie eigens eingeschaltet sind */
    var subTxt="",subDot="";
    if(S.view==="teacher"&&sid&&S.STU[sid]&&!tight){
      var stu=S.STU[sid];
      if(S.state.options.showGender&&stu.gender!=="x")
        subDot='<span class="gdot" style="background:'+GENDERS[stu.gender].color+
               '" title="'+GENDERS[stu.gender].label+'"></span>';
      subTxt=subTeile(stu,subKurz);
    }
    var pinHtml="";
    if(S.beamer)pinHtml="";
    else if(s.m.locked)pinHtml='<button class="pin on'+(tight?" corner":"")+'" tabindex="-1" aria-hidden="true" title="fixiert – tippen zum Lösen">'+ic("pin")+"</button>";
    else if(sid&&!tight)pinHtml='<button class="pin" tabindex="-1" aria-hidden="true" title="Platz fixieren">'+ic("pin")+"</button>";
    var metaHtml=tight?"":('<div class="smeta" style="height:'+metaH+'px">'+mh+pinHtml+"</div>");
    var RT=s.w?R[s.tid]:null;
    var subAn=RT?RT.sub:subAktiv,subHo=RT?RT.subH:subH,notizAn=RT?RT.notiz:notizAktiv,notizHo=RT?RT.notizH:notizH;
    var bandHo=RT?RT.band:bandH,nameFs=RT?RT.fs:gemeinsam;
    var subHtml=subAn?('<div class="ssub" style="height:'+subHo+"px;font-size:"+subFsPx+'px">'+
      (subTxt?subDot+'<span class="sstxt">'+esc(subTxt)+"</span>":"")+"</div>"):"";
    var note=(lehrer&&S.state.options.showNotes&&sid&&S.STU[sid]&&S.STU[sid].note)?S.STU[sid].note:"";
    var noteHtml=notizAn?('<div class="snote" style="height:'+notizHo+"px;font-size:"+noteFsPx+
      'px" title="'+esc(note)+'">'+esc(note)+"</div>"):"";
    d.innerHTML=stripe+drehAuf+(tight?pinHtml:"")+
      '<div class="snm" style="height:'+bandHo+"px;font-size:"+nameFs+'px" title="'+esc(nm)+'">'+
      (sid?'<span class="snt">'+esc(nm)+"</span>":'<span class="sfree">frei</span>')+"</div>"+subHtml+noteHtml+metaHtml+drehZu;
    box.appendChild(d);
  });
  shrinkOverflowingNames(box);
  if(fokusK&&!el("tabPlan").hidden){
    var fn=box.querySelector('.seat[data-k="'+fokusK+'"]');
    if(fn)try{fn.focus({preventScroll:true});}catch(e){fn.focus();}
  }
}
/* Nachmessen: verkleinert Namen, die trotz Schätzung nicht ganz passen */
function shrinkOverflowingNames(box){
  /* Falls die Schätzung danebenlag: für ALLE Namen gemeinsam verkleinern,
     damit sie eine einheitliche Größe behalten. */
  /* gerade Plätze gemeinsam, gedrehte je Tisch – jede Gruppe behält eine einheitliche Größe */
  var gruppen={"":[]};
  box.querySelectorAll(".seat .snm").forEach(function(n){
    var seat=n.closest(".seat"),k=seat.classList.contains("rot")?String(seat.dataset.k).split("#")[0]:"";
    (gruppen[k]=gruppen[k]||[]).push(n);
  });
  Object.keys(gruppen).forEach(function(g){
    var nodes=gruppen[g];
    if(!nodes.length)return;
    var fs=parseFloat(nodes[0].style.fontSize)||12,guard=0;
    function passtNicht(){
      for(var i=0;i<nodes.length;i++){
        var n=nodes[i];
        if(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1)return true;
      }
      return false;
    }
    while(fs>7&&guard++<10&&passtNicht()){
      fs-=1;
      for(var i=0;i<nodes.length;i++)nodes[i].style.fontSize=fs+"px";
    }
  });
}
