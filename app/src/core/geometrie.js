import { hasOwn } from "./konstanten.js";
import { reindex } from "./zustand.js";
import { S } from "../store.js";
import { furniture } from "../ui/plan-ansicht.js";

/* ===================== Platzmodell ===================== */
export function tableCells(t){
  var out=[];for(var i=0;i<t.seats;i++)out.push(t.dir==="h"?{x:t.x+i,y:t.y}:{x:t.x,y:t.y+i});return out;
}
/* ---- Drehbare Tische: Winkel in 5°-Schritten, gemessen im Uhrzeigersinn ----
   Die Rasterlage (x, y, dir) bleibt ganzzahlig; gedreht wird um die Mitte des Tisches. */
export var EINZUG=0.06;                               /* Tische dürfen sich berühren, aber nicht überlappen */
export function winkelNorm(w){
  if(w===null||w===undefined||(typeof w==="string"&&w.trim()===""))return 0;
  var n=Number(w);if(!isFinite(n))return 0;
  n=Math.round(n/5)*5;
  n=((n%180)+180)%180;if(n>90)n-=180;
  return n===0?0:n;                            /* Bereich −85° … 90° */
}
/* Vierteldrehung (90°/270°): Der Tisch wechselt zwischen quer und längs und liegt wieder genau im Raster.
   Gedreht wird um die Tischmitte. Bei gerader Platzzahl läge das Ergebnis auf halben Feldern; gerundet wird
   so, dass Hin- und Zurückdrehen (und viermal 90°) wieder genau auf dem Ausgangsfeld endet.
   Liefert die neue Richtung und die möglichen Lagen, die beste zuerst. */
export function viertelLagen(t){
  var m=tischMasse(t),cx=t.x+m.w/2,cy=t.y+m.h/2,dir=t.dir==="h"?"v":"h";
  var nw=dir==="h"?t.seats:1,nh=dir==="h"?1:t.seats;
  var ex=cx-nw/2,ey=cy-nh/2;
  function wahl(v,hoch){var a=Math.floor(v+1e-9),b=Math.ceil(v-1e-9);return a===b?[a]:(hoch?[b,a]:[a,b]);}
  var xs=wahl(ex,dir==="v"),ys=wahl(ey,dir!=="v"),lagen=[];
  xs.forEach(function(x){ys.forEach(function(y){lagen.push({x:x,y:y});});});
  return{dir:dir,lagen:lagen};
}
/* Bei einer Drehung wandern die Plätze mit: Nummern, Merkmale und Sitzende tauschen die Enden,
   wenn der Tisch dabei „auf den Kopf“ kommt (quer→längs gegen, längs→quer mit dem Uhrzeigersinn, 180°). */
export function plaetzeUmkehren(tid,n){
  function spiegeln(obj){
    if(!obj)return;
    var neu={},i;
    for(i=0;i<n;i++){var a=tid+"#"+i;if(hasOwn(obj,a))neu[tid+"#"+(n-1-i)]=obj[a];}
    for(i=0;i<n;i++)delete obj[tid+"#"+i];
    Object.keys(neu).forEach(function(k){obj[k]=neu[k];});
  }
  spiegeln(S.state.seatMeta);spiegeln(S.state.arrangement);
  if(S.multiSel)spiegeln(S.multiSel);
  if(S.seatMenu&&S.seatMenu.tid===tid&&typeof S.seatMenu.idx==="number")S.seatMenu.idx=n-1-S.seatMenu.idx;
  if(S.selected&&S.selected.kind==="seat"&&typeof S.selected.key==="string"){
    var pos=S.selected.key.lastIndexOf("#");
    if(S.selected.key.slice(0,pos)===tid)S.selected.key=tid+"#"+(n-1-Number(S.selected.key.slice(pos+1)));
  }
}
export function drehFaktor(w){var a=(w||0)*Math.PI/180;return Math.abs(Math.cos(a))+Math.abs(Math.sin(a));}
export function tischMasse(t){return t.dir==="v"?{w:1,h:t.seats}:{w:t.seats,h:1};}
export function tischName(t){return t.seats===1?"Einzeltisch":t.seats+"er-Tisch";}
export function tischForm(t,x,y,ein){
  var m=tischMasse(t),w=m.w-2*(ein||0),h=m.h-2*(ein||0);
  var cx=x+m.w/2,cy=y+m.h/2,a=(t.winkel||0)*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
  return[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(function(p){
    return{x:cx+p[0]*c-p[1]*sn,y:cy+p[0]*sn+p[1]*c};
  });
}
export function rechteckForm(x,y,w,h,ein){
  ein=ein||0;
  return[{x:x+ein,y:y+ein},{x:x+w-ein,y:y+ein},{x:x+w-ein,y:y+h-ein},{x:x+ein,y:y+h-ein}];
}
/* Trennachsen-Test für zwei konvexe Vielecke */
export function polyUeberlappen(A,B){
  var polys=[A,B];
  for(var p=0;p<2;p++){
    var P=polys[p];
    for(var i=0;i<P.length;i++){
      var a=P[i],b=P[(i+1)%P.length],nx=b.y-a.y,ny=a.x-b.x;
      var minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity,j,v;
      for(j=0;j<A.length;j++){v=A[j].x*nx+A[j].y*ny;if(v<minA)minA=v;if(v>maxA)maxA=v;}
      for(j=0;j<B.length;j++){v=B[j].x*nx+B[j].y*ny;if(v<minB)minB=v;if(v>maxB)maxB=v;}
      if(maxA<=minB+1e-9||maxB<=minA+1e-9)return false;
    }
  }
  return true;
}
export function imRaum(poly,cols,rows){
  return poly.every(function(q){return q.x>=-1e-6&&q.y>=-1e-6&&q.x<=cols+1e-6&&q.y<=rows+1e-6;});
}
/* Mittelpunkt von Platz i in Raumkoordinaten (Felder) */
export function sitzMitte(t,i){
  var m=tischMasse(t),cx=t.x+m.w/2,cy=t.y+m.h/2;
  var ox=t.dir==="v"?0:(i+0.5-t.seats/2),oy=t.dir==="v"?(i+0.5-t.seats/2):0;
  var a=(t.winkel||0)*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
  return{x:cx+ox*c-oy*sn,y:cy+ox*sn+oy*c};
}
/* Felder, die ein Tisch berührt – bei gedrehten Tischen alle angeschnittenen */
export function tischZellen(t){
  if(!t.winkel)return tableCells(t);
  var p=tischForm(t,t.x,t.y,EINZUG),out=[];
  var xs=p.map(function(q){return q.x;}),ys=p.map(function(q){return q.y;});
  var x0=Math.floor(Math.min.apply(null,xs)),x1=Math.ceil(Math.max.apply(null,xs));
  var y0=Math.floor(Math.min.apply(null,ys)),y1=Math.ceil(Math.max.apply(null,ys));
  for(var y=y0;y<y1;y++)for(var x=x0;x<x1;x++)if(polyUeberlappen(p,rechteckForm(x,y,1,1,0)))out.push({x:x,y:y});
  return out;
}
export function seatKey(tid,i){return tid+"#"+i;}
export function meta(k){
  if(!S.state.seatMeta[k])S.state.seatMeta[k]={tags:[],locked:false,blocked:false};
  var m=S.state.seatMeta[k];m.tags=m.tags||[];return m;
}
export function allSeats(){
  var out=[];
  S.state.tables.forEach(function(t){
    tableCells(t).forEach(function(c,i){
      var k=seatKey(t.id,i),mm=sitzMitte(t,i);
      out.push({key:k,tid:t.id,idx:i,x:c.x,y:c.y,fx:mm.x,fy:mm.y,w:t.winkel||0,m:meta(k)});
    });
  });
  return out;
}
export function usableSeats(){return allSeats().filter(function(s){return !s.m.blocked;});}
export function cleanArrangement(){
  reindex();
  var valid={};usableSeats().forEach(function(s){valid[s.key]=1;});
  var seen={};
  Object.keys(S.state.arrangement).forEach(function(k){
    var sid=S.state.arrangement[k];
    if(!valid[k]||!S.STU[sid]||seen[sid])delete S.state.arrangement[k];
    else seen[sid]=1;
  });
}
export function buildAdj(seats){
  /* Vier Beziehungsarten zwischen zwei Plätzen:
     bench   – direkt nebeneinander (gleiche Bank oder zusammengeschobene Tische)
     sideGap – nebeneinander, aber durch einen Gang getrennt
     front   – direkt vor- oder hintereinander
     diag    – schräg gegenüber                                                     */
  var bench={},sideGap={},front={},diag={},i,j;
  seats.forEach(function(s){bench[s.key]=[];sideGap[s.key]=[];front[s.key]=[];diag[s.key]=[];});
  function link(m,a,b){m[a].push(b);m[b].push(a);}
  for(i=0;i<seats.length;i++)for(j=i+1;j<seats.length;j++){
    var a=seats[i],b=seats[j];
    if(a.tid===b.tid){
      if(Math.abs(a.idx-b.idx)===1)link(bench,a.key,b.key);
      continue;                       /* gleicher Tisch, aber nicht benachbart */
    }
    if(!a.w&&!b.w){
      var dx=Math.abs(a.x-b.x), dy=Math.abs(a.y-b.y);
      if(dy===0&&dx===1)link(bench,a.key,b.key);
      else if(dy===0&&(dx===2||dx===3))link(sideGap,a.key,b.key);
      else if(dx===0&&(dy===1||dy===2))link(front,a.key,b.key);
      else if(dx>=1&&dx<=2&&dy>=1&&dy<=2)link(diag,a.key,b.key);
    }else{
      /* gedrehte Tische: Abstand der Platzmitten, gemessen in Richtung der Tische */
      var wa=a.w,wb=b.w;
      if(Math.abs(wa-wb)>90){if(wa<wb)wa+=180;else wb+=180;}
      var th=(wa+wb)/2*Math.PI/180,c=Math.cos(th),sn=Math.sin(th);
      var ddx=b.fx-a.fx,ddy=b.fy-a.fy;
      var lx=Math.abs(ddx*c+ddy*sn),ly=Math.abs(-ddx*sn+ddy*c),d=Math.sqrt(lx*lx+ly*ly);
      if(d<=1.3){if(lx>=ly)link(bench,a.key,b.key);else link(front,a.key,b.key);}
      else if(ly<0.6&&d<=3.3)link(sideGap,a.key,b.key);
      else if(lx<0.6&&d<=2.3)link(front,a.key,b.key);
      else if(d<=2.9)link(diag,a.key,b.key);
    }
  }
  /* Abstand jedes Platzes zum nächsten Lehrertisch (in Plätzen) */
  var pulte=furniture().filter(function(f){return f.type==="desk";}),lehrer=null;
  if(pulte.length){
    lehrer={};
    seats.forEach(function(s){
      var best=Infinity,px=s.fx!==undefined?s.fx:s.x+0.5,py=s.fy!==undefined?s.fy:s.y+0.5;
      pulte.forEach(function(f){
        var ex=Math.max(f.x-px,0,px-(f.x+f.w)),ey=Math.max(f.y-py,0,py-(f.y+1));
        best=Math.min(best,Math.sqrt(ex*ex+ey*ey));
      });
      lehrer[s.key]=Math.round(best*100)/100;
    });
  }
  return{bench:bench,sideGap:sideGap,front:front,diag:diag,side:bench,lehrer:lehrer};
}
