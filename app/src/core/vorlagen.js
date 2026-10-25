import { uid } from "./basis.js";

/* ---- Klassenraum-Vorlagen ---- */
function vorlageBauen(cols,rows,reihen,muster,moebel){
  var t=[];
  for(var r=0;r<reihen;r++){
    var x=muster.start;
    muster.tische.forEach(function(n,i){
      t.push({id:uid("t"),x:x,y:2+r*2,seats:n,dir:"h"});
      x+=n+(muster.luecke[i]||0);
    });
  }
  return{cols:cols,rows:rows,tables:t,furniture:moebel.map(function(f){return{id:uid("f"),type:f.type,x:f.x,y:f.y,w:f.w,label:f.label};})};
}
/* A: drei Doppelbänke je Reihe, fünf Reihen */
export function vorlageA(){
  return vorlageBauen(10,12,5,{start:1,tische:[2,2,2],luecke:[1,1]},
    [{type:"board",x:2,y:0,w:6,label:"Tafel"},{type:"desk",x:0,y:0,w:2,label:"Lehrertisch"}]);
}
/* B: quer – 2er, 4er, 2er je Reihe, drei Reihen */
export function vorlageB(){
  return vorlageBauen(12,8,3,{start:1,tische:[2,4,2],luecke:[1,1]},
    [{type:"board",x:3,y:0,w:6,label:"Tafel"},{type:"desk",x:10,y:0,w:2,label:"Lehrertisch"}]);
}
/* C: NaWi-Raum – sieben Plätze je Reihe (4er und 3er direkt aneinander), vier Reihen */
export function vorlageC(){
  return vorlageBauen(9,10,4,{start:1,tische:[4,3],luecke:[0]},
    [{type:"board",x:2,y:0,w:5,label:"Tafel"},{type:"desk",x:7,y:0,w:2,label:"Lehrertisch"}]);
}
