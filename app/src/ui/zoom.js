import { el } from "../core/basis.js";
import { S } from "../store.js";
import { renderRoom } from "./plan-ansicht.js";
import { dndClear } from "./plan-dnd.js";
import { drawEditor } from "./raum-editor.js";

/* ---- Zoom: nur Darstellung, das Raster bleibt unverändert ---- */
var ZOOM_KEY="sitzplan_zoom";
var zoom={plan:1,raum:1};
try{
  var zGespeichert=JSON.parse(localStorage.getItem(ZOOM_KEY)||"null");
  if(zGespeichert&&typeof zGespeichert==="object"){
    if(zGespeichert.plan>0)zoom.plan=zGespeichert.plan;
    if(zGespeichert.raum>0)zoom.raum=zGespeichert.raum;
  }
}catch(e){}
export function zoomWert(w){return Math.max(.5,Math.min(2.2,Number(zoom[w])||1));}
export function zoomSetzen(w,z){
  zoom[w]=Math.round(Math.max(.5,Math.min(2.2,z))*100)/100;
  if(Math.abs(zoom[w]-1)<.04)zoom[w]=1;
  try{localStorage.setItem(ZOOM_KEY,JSON.stringify(zoom));}catch(e){}
  if(w==="plan")renderRoom();else drawEditor();
  zoomAnzeige();
}
export function zoomAnzeige(){
  if(el("zFit"))el("zFit").textContent=Math.round(zoomWert("plan")*100)+" %";
  if(el("edZFit"))el("edZFit").textContent=Math.round(zoomWert("raum")*100)+" %";
}
export function zoomStufe(w,richtung){
  var stufen=[.5,.6,.7,.8,.9,1,1.15,1.3,1.5,1.75,2,2.2],z=zoomWert(w),i;
  if(richtung>0){for(i=0;i<stufen.length;i++)if(stufen[i]>z+.01){zoomSetzen(w,stufen[i]);return;}}
  else{for(i=stufen.length-1;i>=0;i--)if(stufen[i]<z-.01){zoomSetzen(w,stufen[i]);return;}}
}
/* Zwei Finger zum Zoomen, Strg + Mausrad bzw. Trackpad-Geste ebenso */
export function pinchAnbinden(node,w){
  if(!node||node.dataset.pinch)return;
  node.dataset.pinch="1";
  var pts={},start=null;
  node.addEventListener("pointerdown",function(e){
    if(e.pointerType!=="touch")return;
    pts[e.pointerId]={x:e.clientX,y:e.clientY};
    var ids=Object.keys(pts);
    if(ids.length===2){
      if(S.dnd)dndClear();
      var a=pts[ids[0]],b=pts[ids[1]];
      start={d:Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),z:zoomWert(w)};
    }
  },true);
  node.addEventListener("pointermove",function(e){
    if(!pts[e.pointerId])return;
    pts[e.pointerId]={x:e.clientX,y:e.clientY};
    var ids=Object.keys(pts);
    if(start&&ids.length===2){
      var a=pts[ids[0]],b=pts[ids[1]];
      var z=start.z*Math.hypot(a.x-b.x,a.y-b.y)/start.d;
      if(Math.abs(z-zoomWert(w))>.04)zoomSetzen(w,z);
    }
  },true);
  function ende(e){delete pts[e.pointerId];if(Object.keys(pts).length<2)start=null;}
  node.addEventListener("pointerup",ende,true);
  node.addEventListener("pointercancel",ende,true);
  node.addEventListener("wheel",function(e){
    if(!e.ctrlKey)return;
    e.preventDefault();
    zoomSetzen(w,zoomWert(w)*(e.deltaY<0?1.08:1/1.08));
  },{passive:false});
}
/* Größe neu berechnen, wenn sich die Arbeitsfläche ändert */
S.rTimer=null;
function neuMessen(){
  clearTimeout(S.rTimer);
  S.rTimer=setTimeout(function(){
    if(S.tab==="room")drawEditor();else if(S.tab==="plan")renderRoom();
  },80);
}
window.addEventListener("resize",neuMessen);
export var groessenBeobachter=window.ResizeObserver?new ResizeObserver(neuMessen):null;
if(groessenBeobachter)groessenBeobachter.observe(el("stage"));
