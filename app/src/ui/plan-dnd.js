import { el } from "../core/basis.js";
import { meta } from "../core/geometrie.js";
import { sName } from "../core/regeln.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { ansage, toast } from "./meldungen.js";
import { renderAll } from "./plan-status.js";

/* ---- Ziehen und Ablegen im fertigen Sitzplan ---- */
S.dnd=null;
S.justDragged=false;
export function dndStart(e,src){
  S.dnd={src:src,sx:e.clientX,sy:e.clientY,active:false,ghost:null,target:null};
}
function dndLabel(){
  return S.dnd.src.kind==="seat"?sName(S.state.arrangement[S.dnd.src.key]):sName(S.dnd.src.studentId);
}
function dndActivate(){
  S.dnd.active=true;
  S.selected=null;
  var g=document.createElement("div");
  g.className="dragghost";g.textContent=dndLabel();
  document.body.appendChild(g);
  S.dnd.ghost=g;
  if(S.dnd.src.kind==="seat"){
    var n=document.querySelector('#room .seat[data-k="'+S.dnd.src.key+'"]');
    if(n)n.classList.add("dragsrc");
  }
}
export function dndClear(){
  if(S.dnd&&S.dnd.ghost)S.dnd.ghost.remove();
  document.querySelectorAll(".seat.dropok,.seat.dragsrc").forEach(function(n){
    n.classList.remove("dropok","dragsrc");
  });
  var u=el("unplaced");if(u)u.classList.remove("dropok");
  S.dnd=null;
}
function dndTargetAt(x,y){
  var elx=document.elementFromPoint(x,y);
  if(!elx||!elx.closest)return null;
  var seat=elx.closest("#room .seat");
  if(seat&&!seat.classList.contains("blocked"))return{kind:"seat",key:seat.dataset.k,node:seat};
  if(elx.closest("#unplaced"))return{kind:"pool",node:el("unplaced")};
  return null;
}
document.addEventListener("pointermove",function(e){
  if(!S.dnd)return;
  if(!S.dnd.active){
    if(Math.abs(e.clientX-S.dnd.sx)<6&&Math.abs(e.clientY-S.dnd.sy)<6)return;
    dndActivate();
  }
  S.dnd.ghost.style.left=e.clientX+"px";
  S.dnd.ghost.style.top=(e.clientY-26)+"px";
  document.querySelectorAll(".seat.dropok").forEach(function(n){n.classList.remove("dropok");});
  var u=el("unplaced");if(u)u.classList.remove("dropok");
  var t=dndTargetAt(e.clientX,e.clientY);
  S.dnd.target=t;
  if(t&&t.kind==="seat"&&t.key!==S.dnd.src.key)t.node.classList.add("dropok");
  if(t&&t.kind==="pool"&&S.dnd.src.kind==="seat")t.node.classList.add("dropok");
});
document.addEventListener("pointerup",function(e){
  if(!S.dnd)return;
  var wasActive=S.dnd.active, src=S.dnd.src, t=S.dnd.target;
  dndClear();
  if(!wasActive)return;
  S.justDragged=true;
  setTimeout(function(){S.justDragged=false;},60);
  if(!t)return;
  if(t.kind==="pool"){
    if(src.kind==="seat"){
      if(meta(src.key).locked){toast("Dieser Platz ist fixiert – erst die Fixierung lösen.","w");return;}
      schritt("Person vom Platz genommen");
      delete S.state.arrangement[src.key];
      renderAll();
    }
    return;
  }
  if(t.key===src.key)return;
  if(src.kind==="seat"){
    if(meta(src.key).locked||meta(t.key).locked){
      toast("Fixierte Plätze lassen sich nicht tauschen – erst die Fixierung lösen.","w");return;
    }
    schritt(S.state.arrangement[t.key]!==undefined?"Plätze getauscht":"Person umgesetzt");
    var a=S.state.arrangement[src.key], b=S.state.arrangement[t.key];
    if(b===undefined)delete S.state.arrangement[src.key];else S.state.arrangement[src.key]=b;
    if(a===undefined)delete S.state.arrangement[t.key];else S.state.arrangement[t.key]=a;
  }else{
    if(meta(t.key).locked){toast("Dieser Platz ist fixiert – erst die Fixierung lösen.","w");return;}
    schritt("Person gesetzt");
    S.state.arrangement[t.key]=src.studentId;
  }
  renderAll();
});
document.addEventListener("pointercancel",function(){if(S.dnd)dndClear();});

el("room").addEventListener("pointerdown",function(e){
  if(S.beamer)return;
  if(e.button&&e.button!==0)return;
  if(!e.target||!e.target.closest)return;
  if(e.target.closest(".pin"))return;
  var node=e.target.closest(".seat");
  if(!node||node.classList.contains("blocked"))return;
  var k=node.dataset.k;
  if(S.state.arrangement[k]===undefined)return;   /* leere Plätze gibt es nichts zu ziehen */
  dndStart(e,{kind:"seat",key:k});
});

function platzAktivieren(k,tastatur){
  if(tastatur)S.raumFokus=k;
  if(!S.selected){
    S.selected={kind:"seat",key:k};renderAll();
    ansage(S.state.arrangement[k]!==undefined
      ?sName(S.state.arrangement[k])+" ausgewählt. Zielplatz wählen und Eingabe drücken."
      :"Freier Platz ausgewählt. Jetzt eine Person wählen, die hierher soll.");
    return;
  }
  if(S.selected.kind==="seat"&&S.selected.key===k){S.selected=null;renderAll();ansage("Auswahl aufgehoben.");return;}
  if(S.selected.kind==="seat"){
    if(meta(S.selected.key).locked||meta(k).locked){
      toast("Fixierte Plätze lassen sich nicht tauschen – erst die Fixierung lösen.","w");S.selected=null;renderAll();return;
    }
    var a=S.state.arrangement[S.selected.key],b=S.state.arrangement[k];
    schritt((a!==undefined&&b!==undefined)?"Plätze getauscht":"Person umgesetzt");
    if(b===undefined)delete S.state.arrangement[S.selected.key];else S.state.arrangement[S.selected.key]=b;
    if(a===undefined)delete S.state.arrangement[k];else S.state.arrangement[k]=a;
    ansage((a!==undefined&&b!==undefined)?sName(a)+" und "+sName(b)+" haben die Plätze getauscht."
      :sName(a!==undefined?a:b)+" wurde umgesetzt.");
  }else{
    if(meta(k).locked){toast("Dieser Platz ist fixiert – erst die Fixierung lösen.","w");S.selected=null;renderAll();return;}
    schritt("Person gesetzt");
    S.state.arrangement[k]=S.selected.studentId;
    ansage(sName(S.selected.studentId)+" sitzt jetzt hier.");
  }
  S.selected=null;renderAll();
}
export function fixierenUmschalten(k){
  var m=meta(k);
  schritt(m.locked?"Fixierung gelöst":"Platz fixiert");
  m.locked=!m.locked;
  renderAll();
  ansage(m.locked?"Platz fixiert.":"Fixierung gelöst.");
}
el("stage").addEventListener("click",function(e){
  if(S.beamer||!S.selected||S.justDragged)return;
  if(e.target.closest&&e.target.closest(".seat"))return;
  S.selected=null;renderAll();
});
el("room").addEventListener("click",function(e){
  if(S.beamer)return;
  if(S.justDragged){S.justDragged=false;return;}
  if(!e.target||!e.target.closest)return;
  var node=e.target.closest(".seat");
  if(!node||node.classList.contains("blocked"))return;
  var k=node.dataset.k;
  if(e.target.closest(".pin")){fixierenUmschalten(k);return;}
  platzAktivieren(k,false);
});
/* Tastaturbedienung als Alternative zu Ziehen und Ablegen */
function naechsterPlatz(node,dx,dy){
  var r0=node.getBoundingClientRect(),x0=r0.left+r0.width/2,y0=r0.top+r0.height/2;
  var best=null,bestW=Infinity;
  document.querySelectorAll("#room .seat:not(.blocked)").forEach(function(n){
    if(n===node)return;
    var r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    var haupt=dx?(x-x0)*dx:(y-y0)*dy, neben=dx?Math.abs(y-y0):Math.abs(x-x0);
    if(haupt<=2)return;
    var wert=haupt+neben*2.5;
    if(wert<bestW){bestW=wert;best=n;}
  });
  return best;
}
el("room").addEventListener("keydown",function(e){
  var node=e.target&&e.target.closest?e.target.closest(".seat"):null;
  if(!node||node.classList.contains("blocked"))return;
  if(S.beamer&&!/^Arrow/.test(e.key))return;
  var k=node.dataset.k;
  if(e.key==="Enter"||e.key===" "){e.preventDefault();platzAktivieren(k,true);return;}
  if(e.key==="Escape"&&S.selected){e.preventDefault();e.stopPropagation();S.selected=null;S.raumFokus=k;renderAll();ansage("Auswahl aufgehoben.");return;}
  if((e.key==="f"||e.key==="F")&&!e.ctrlKey&&!e.metaKey){
    if(S.state.arrangement[k]!==undefined||meta(k).locked){e.preventDefault();S.raumFokus=k;fixierenUmschalten(k);}
    return;
  }
  if(e.key==="Delete"||e.key==="Backspace"){
    var sid=S.state.arrangement[k];
    if(sid!==undefined){
      e.preventDefault();
      if(meta(k).locked){toast("Dieser Platz ist fixiert – erst die Fixierung lösen.","w");return;}
      schritt("Person vom Platz genommen");
      delete S.state.arrangement[k];S.raumFokus=k;renderAll();
      ansage(sName(sid)+" steht jetzt unter „Nicht platziert“.");
    }
    return;
  }
  var d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(d){e.preventDefault();var z=naechsterPlatz(node,d[0],d[1]);if(z)z.focus();}
});
