"use strict";

/* ===================== Hilfsfunktionen ===================== */
export function uid(p){return p+"_"+Math.random().toString(36).slice(2,9);}
export function esc(s){return String(s).replace(/[&<>"']/g,function(m){
  return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[m];});}
export function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=(Math.random()*(i+1))|0;var t=a[i];a[i]=a[j];a[j]=t;}return a;}
export function el(id){return document.getElementById(id);}
