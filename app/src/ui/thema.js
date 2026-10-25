import { el } from "../core/basis.js";
import { S } from "../store.js";

/* ===================== Darstellung: automatisch, hell, dunkel ===================== */
export var THEMA_KEY="sitzplan_thema";
S.thema="auto";
try{S.thema=localStorage.getItem(THEMA_KEY)||"auto";}catch(e){}
export function themaAnwenden(){
  var r=document.documentElement;
  if(S.thema==="light"||S.thema==="dark")r.setAttribute("data-theme",S.thema);else r.removeAttribute("data-theme");
  el("btnThemeTxt").textContent="Darstellung: "+({light:"hell",dark:"dunkel"}[S.thema]||"automatisch");
}
