/* ===================== Hilfsfunktionen ===================== */
/* Zufall: austauschbar, damit Tests mit festem Startwert reproduzierbar laufen */
var zufall=Math.random;
export function setzeZufall(f){zufall=f||Math.random;}
export function rnd(){return zufall();}
/* kleiner, schneller Zufallsgenerator mit Startwert (mulberry32) */
export function zufallMitStartwert(seed){
  var a=seed>>>0;
  return function(){
    a=(a+0x6D2B79F5)>>>0;
    var t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return((t^(t>>>14))>>>0)/4294967296;
  };
}
export function uid(p){return p+"_"+rnd().toString(36).slice(2,9);}
export function esc(s){return String(s).replace(/[&<>"']/g,function(m){
  return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[m];});}
export function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=(rnd()*(i+1))|0;var t=a[i];a[i]=a[j];a[j]=t;}return a;}
export function el(id){return document.getElementById(id);}
