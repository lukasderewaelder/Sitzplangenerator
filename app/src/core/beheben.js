import { buildAdj, cleanArrangement, usableSeats } from "./geometrie.js";
import { sName } from "./regeln.js";
import { evaluate } from "./solver.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { ansage, toast } from "../ui/meldungen.js";
import { renderAll } from "../ui/plan-status.js";

/* ---- Einen einzelnen Konflikt beheben: nur die Betroffenen umsetzen, der Rest bleibt ----
   Gesucht wird der kleinste Eingriff: zuerst ein einzelner Tausch (oder Umzug auf einen
   freien Platz), erst wenn das nicht reicht ein Ringtausch über drei Plätze. Angenommen
   wird nur eine Lösung, bei der der Konflikt verschwindet und kein neuer entsteht. */
export function problemSchluessel(i){
  return i.type+":"+(i.type==="black"?[i.a,i.b].sort().join(","):i.a);
}
export function konfliktBeheben(schl){
  if(S.beamer)return;
  cleanArrangement();
  var seats=usableSeats(),adj=buildAdj(seats);
  var arr=JSON.parse(JSON.stringify(S.state.arrangement));
  var basis=evaluate(arr,seats,adj);
  var ziel=basis.issues.filter(function(i){return problemSchluessel(i)===schl;})[0];
  if(!ziel){toast("Dieser Konflikt besteht nicht mehr.");renderAll();return;}
  var alt={};basis.issues.forEach(function(i){alt[problemSchluessel(i)]=1;});
  var pos={};Object.keys(arr).forEach(function(k){pos[arr[k]]=k;});
  function fix(k){var m=S.state.seatMeta[k];return !!(m&&m.locked);}
  /* Wer darf sich bewegen? Die Betroffenen – bei „Zusammen setzen“ auch die übrige Gruppe,
     bei „allein sitzen“ auch die direkten Nachbarn. */
  var wer=[];
  if(ziel.type==="black")wer=[ziel.a,ziel.b];
  else if(ziel.type==="white"){
    wer=[ziel.a];
    S.state.whitelist.forEach(function(g){if(g.members.indexOf(ziel.a)!==-1)g.members.forEach(function(m){if(wer.indexOf(m)===-1)wer.push(m);});});
  }else if(ziel.type==="solo"){
    wer=[ziel.a];
    (adj.bench[pos[ziel.a]]||[]).forEach(function(k){if(arr[k]&&wer.indexOf(arr[k])===-1)wer.push(arr[k]);});
  }else wer=[ziel.a];
  wer=wer.filter(function(id){return pos[id]&&!fix(pos[id]);});
  if(!wer.length){toast("Die betroffenen Plätze sind fixiert – erst die Fixierung lösen.","w");return;}
  var ziele=seats.map(function(s){return s.key;}).filter(function(k){return !fix(k);});
  function tausch(k1,k2){
    var x=arr[k1],y=arr[k2];
    if(y===undefined)delete arr[k1];else arr[k1]=y;
    if(x===undefined)delete arr[k2];else arr[k2]=x;
  }
  var zaehler=0,GRENZE=40000;
  function pruefe(){
    zaehler++;
    var r=evaluate(arr,seats,adj),weg=true,neu=false;
    r.issues.forEach(function(i){var s=problemSchluessel(i);if(s===schl)weg=false;else if(!alt[s])neu=true;});
    return(weg&&!neu&&r.pen<basis.pen)?r.pen:null;
  }
  function entfernung(k1,k2){
    var a=byKey[k1],b=byKey[k2];return a&&b?Math.abs(a.x-b.x)+Math.abs(a.y-b.y):0;
  }
  var byKey={};seats.forEach(function(s){byKey[s.key]=s;});
  var best=null;
  function merke(pen,zuege,bewegt,weg){
    var w=[pen,bewegt,weg];
    if(!best||w[0]<best.w[0]||(w[0]===best.w[0]&&(w[1]<best.w[1]||(w[1]===best.w[1]&&w[2]<best.w[2]))))best={w:w,zuege:zuege};
  }
  /* 1) ein einzelner Tausch oder Umzug */
  wer.forEach(function(p){
    var k1=pos[p];
    ziele.forEach(function(k2){
      if(k2===k1)return;
      var zweiter=arr[k2];
      tausch(k1,k2);
      var pen=pruefe();
      if(pen!==null)merke(pen,[[k1,k2]],zweiter===undefined?1:2,entfernung(k1,k2));
      tausch(k1,k2);
    });
  });
  /* 2) Ringtausch über drei Plätze, falls ein einzelner Tausch nicht reicht */
  if(!best){
    wer.some(function(p){
      var k1=pos[p];
      return ziele.some(function(k2){
        if(k2===k1)return false;
        tausch(k1,k2);
        ziele.some(function(k3){
          if(k3===k1||k3===k2)return false;
          tausch(k1,k3);
          var pen=pruefe();
          if(pen!==null)merke(pen,[[k1,k2],[k1,k3]],3,entfernung(k1,k2)+entfernung(k1,k3));
          tausch(k1,k3);
          return zaehler>GRENZE;
        });
        tausch(k1,k2);
        return zaehler>GRENZE;
      });
    });
  }
  if(!best){
    toast("Dieser Konflikt lässt sich nicht beheben, ohne einen neuen zu erzeugen. Tipp: Regel ändern oder neu anordnen.","w");
    return;
  }
  var vorher=JSON.parse(JSON.stringify(S.state.arrangement));
  schritt("Konflikt behoben");
  best.zuege.forEach(function(z){
    var a=S.state.arrangement,x=a[z[0]],y=a[z[1]];
    if(y===undefined)delete a[z[0]];else a[z[0]]=y;
    if(x===undefined)delete a[z[1]];else a[z[1]]=x;
  });
  var bewegt=[];
  Object.keys(S.state.arrangement).forEach(function(k){if(vorher[k]!==S.state.arrangement[k])bewegt.push(S.state.arrangement[k]);});
  S.selected=null;
  S.hervor={ids:bewegt,bis:Date.now()+3600};
  renderAll();
  setTimeout(function(){S.hervor=null;document.querySelectorAll("#room .flash").forEach(function(x){x.classList.remove("flash");});},3700);
  var namen=bewegt.map(sName);
  var text=namen.length===1?namen[0]+" sitzt jetzt auf einem freien Platz."
    :namen.length===2?namen[0]+" und "+namen[1]+" haben die Plätze getauscht."
    :namen.length+" Personen haben die Plätze gewechselt: "+namen.join(", ")+".";
  toast("Behoben – "+text);ansage("Konflikt behoben. "+text);
}
