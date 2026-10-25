import { buildAdj, usableSeats } from "./geometrie.js";
import { stufenText } from "./konstanten.js";
import { LEHRER_STUFEN, blackVerletzt, lehrerStufe, sName, stufeVon, tagById, whiteVerbunden } from "./regeln.js";
import { maxAllein, mussAllein } from "./solver.js";
import { doppelteNamen, reindex } from "./zustand.js";
import { S } from "../store.js";

/* ===================== Vorprüfung ===================== */
/* Größte Zahl von Personen, die sich nach einer Blacklist-Stufe ohne Kontakt setzen lassen
   (unabhängige Menge im Konfliktgraphen). Sucht nur bis „ziel“ und bricht bei zu großem
   Aufwand ab – dann wird vorsichtshalber kein Hinweis angezeigt. */
function maxGetrennt(seats,adj,stufe,ziel){
  var n=seats.length,nb=[],i,j;
  for(i=0;i<n;i++)nb.push([]);
  for(i=0;i<n;i++)for(j=i+1;j<n;j++){
    if(blackVerletzt(adj,stufe,seats[i].key,seats[j].key)){nb[i].push(j);nb[j].push(i);}
  }
  var best=0,knoten=0,abbruch=false;
  function suche(kand,groesse){
    if(abbruch||best>=ziel)return;
    if(++knoten>60000){abbruch=true;return;}
    if(groesse>best)best=groesse;
    if(groesse+kand.length<=best)return;
    /* Knoten ohne Nachbarn in der Kandidatenmenge immer nehmen */
    var inK={};kand.forEach(function(v){inK[v]=1;});
    var grad=kand.map(function(v){return nb[v].filter(function(u){return inK[u];}).length;});
    var mi=0,ma=0;
    for(var q=1;q<kand.length;q++){if(grad[q]<grad[mi])mi=q;if(grad[q]>grad[ma])ma=q;}
    if(!kand.length)return;
    if(grad[mi]<=1){
      var v=kand[mi];
      suche(kand.filter(function(u){return u!==v&&nb[v].indexOf(u)===-1;}),groesse+1);
      return;
    }
    var w=kand[ma];
    suche(kand.filter(function(u){return u!==w&&nb[w].indexOf(u)===-1;}),groesse+1);
    suche(kand.filter(function(u){return u!==w;}),groesse);
  }
  var alle=[];for(i=0;i<n;i++)alle.push(i);
  suche(alle,0);
  return abbruch?ziel:Math.min(best,ziel);
}
/* Größte zusammenhängende Platzgruppe nach einer Whitelist-Stufe */
function groessteGruppe(seats,adj,stufe){
  var seen={},best=0;
  seats.forEach(function(s){
    if(seen[s.key])return;
    var stack=[s.key],n=0;seen[s.key]=1;
    while(stack.length){
      var k=stack.pop();n++;
      seats.forEach(function(o){
        if(!seen[o.key]&&whiteVerbunden(adj,stufe,k,o.key)){seen[o.key]=1;stack.push(o.key);}
      });
    }
    if(n>best)best=n;
  });
  return best;
}
S.vpCache={sig:null,res:null};
export function vorpruefung(){
  var sig=JSON.stringify([S.state.tables,S.state.seatMeta,S.state.students,S.state.blacklist,S.state.whitelist,
    S.state.options.solo,S.state.tags,S.state.room.furniture]);
  if(sig===S.vpCache.sig)return S.vpCache.res;
  reindex();
  var seats=usableSeats(),adj=buildAdj(seats);
  var n=S.state.students.length,pl=seats.length,H=[];
  function h(stufe,text,ziel,arg){H.push({stufe:stufe,text:text,ziel:ziel,arg:arg||""});}
  function namen(ids){return ids.map(sName).join(", ");}
  if(!n)h("info","Noch keine Schüler:innen angelegt.","class");
  if(!pl)h("warn","Es gibt noch keine nutzbaren Plätze.","room");
  if(n&&pl&&n>pl)h("warn","Für "+n+" Schüler:innen stehen nur "+pl+" nutzbare Plätze zur Verfügung.","room");
  /* gleiche Namen */
  doppelteNamen(S.state.students).forEach(function(g){
    h("warn","„"+g[0].name+"“ gibt es "+g.length+"-mal. Bitte den Nachnamen (oder einen Anfangsbuchstaben) ergänzen, damit die Namen eindeutig sind.","person",g[1].id);
  });
  /* Nah am Lehrertisch */
  var lehrerListe=S.state.students.filter(function(s){return s.lehrer;});
  if(lehrerListe.length){
    var wer=lehrerListe.length===1?lehrerListe[0].name+" soll":lehrerListe.length+" Personen sollen";
    if(!adj.lehrer)h("info",wer+" nah am Lehrertisch sitzen – im Raum steht aber kein Lehrertisch. Die Regel ruht, bis einer aufgestellt ist.","room");
    else{
      /* Standard: Umkreis 4; weich: Umkreis 6 – wer „Standard“ hat, zählt auch im weiteren Umkreis mit */
      var nStd=lehrerListe.filter(function(s){return lehrerStufe(s.lehrer)==="standard";}).length;
      [["standard",nStd],["weich",lehrerListe.length]].forEach(function(x){
        var st=LEHRER_STUFEN[x[0]],anz=x[1];
        if(!anz)return;
        if(x[0]==="weich"&&anz===nStd)return;           /* niemand mit „weich“ – schon oben geprüft */
        var nah=seats.filter(function(s){return adj.lehrer[s.key]<=st.radius+1e-9;}).length;
        if(anz>nah)h("warn",(anz===1?"1 Person soll":anz+" Personen sollen")+" im Umkreis von "+st.radius+" Feldern um den Lehrertisch sitzen"+
          (x[0]==="weich"&&nStd?" (Standard und weich zusammen)":"")+", dort gibt es aber "+
          (nah===0?"keinen nutzbaren Platz":nah===1?"nur 1 nutzbaren Platz":"nur "+nah+" nutzbare Plätze")+".","room");
      });
    }
  }
  /* Platzmerkmale */
  S.state.tags.forEach(function(t){
    var need=S.state.students.filter(function(s){return s.requiredTags.indexOf(t.id)!==-1;});
    if(!need.length)return;
    var have=seats.filter(function(s){return s.m.tags.indexOf(t.id)!==-1;}).length;
    if(need.length>have)h("warn",(need.length===1?need[0].name+" benötigt":need.length+" Personen benötigen")+
      " einen Platz mit „"+t.name+"“, aber "+(have===0?"kein Platz ist":have===1?"nur 1 Platz ist":"nur "+have+" Plätze sind")+
      " so markiert.","room");
  });
  var kombi={};
  S.state.students.forEach(function(s){
    if(s.requiredTags.length>1){var k=s.requiredTags.slice().sort().join("+");(kombi[k]=kombi[k]||[]).push(s);}
  });
  Object.keys(kombi).forEach(function(k){
    var ids=k.split("+"),need=kombi[k].length;
    var have=seats.filter(function(s){return ids.every(function(id){return s.m.tags.indexOf(id)!==-1;});}).length;
    if(need>have)h("warn",need+(need===1?" Person braucht":" Personen brauchen")+" einen Platz mit „"+
      ids.map(function(id){var t=tagById(id);return t?t.name:"?";}).join("“ und „")+"“ zugleich – "+
      (have?"nur "+have+" vorhanden.":"so einen Platz gibt es nicht."),"room");
  });
  /* Einzelsitzen */
  if(S.state.options.solo!=="all"){
    S.state.students.forEach(function(s){
      if(s.solo&&S.state.whitelist.some(function(g){return g.members.length>1&&g.members.indexOf(s.id)!==-1;}))
        h("warn",s.name+" soll allein sitzen und ist gleichzeitig in einer Zusammen-Gruppe.","person",s.id);
    });
  }else if(S.state.whitelist.some(function(g){return g.members.length>1;})){
    h("info","Im Modus „alle einzeln“ gilt „Zusammen setzen“ nicht.","opts");
  }
  var gew=S.state.students.filter(mussAllein).length;
  if(gew&&pl){
    var mo=maxAllein(seats,adj,Math.min(n,pl));
    if(gew>mo)h("warn",S.state.options.solo==="all"
      ?"Bei "+n+" Schüler:innen können in diesem Raum höchstens "+mo+" allein sitzen."
      :(gew===1?"1 Person soll":gew+" Personen sollen")+" allein sitzen, möglich "+
        (mo===0?"ist das bei dieser Belegung nicht":mo===1?"ist höchstens 1":"sind höchstens "+mo)+".",
      S.state.options.solo==="all"?"room":"opts");
  }
  /* Widersprüche zwischen den Regeln */
  S.state.blacklist.forEach(function(b,bi){
    S.state.whitelist.forEach(function(w,wi){
      var gem=b.members.filter(function(m){return w.members.indexOf(m)!==-1&&S.STU[m];});
      if(gem.length>=2)h("warn",namen(gem)+" sollen zugleich auseinander (Auseinander-Gruppe "+(bi+1)+
        ") und zusammen (Zusammen-Gruppe "+(wi+1)+") sitzen.","rule",b.id);
    });
  });
  /* Lässt sich jede Gruppe im Raum überhaupt erfüllen? */
  S.state.blacklist.forEach(function(g,gi){
    var k=g.members.filter(function(m){return S.STU[m];}).length;
    if(k<2||!pl)return;
    var st=stufeVon(g),m=maxGetrennt(seats,adj,st,k);
    if(m<k)h("warn","Auseinander-Gruppe "+(gi+1)+" ("+stufenText("bl",st)+", "+k+" Personen) lässt sich in diesem Raum nicht vollständig trennen – höchstens "+
      m+" finden Plätze ohne Kontakt.","rule",g.id);
  });
  if(S.state.options.solo!=="all")S.state.whitelist.forEach(function(g,gi){
    var k=g.members.filter(function(m){return S.STU[m];}).length;
    if(k<2||!pl)return;
    var st=stufeVon(g),gr=groessteGruppe(seats,adj,st);
    if(gr<k)h("warn","Zusammen-Gruppe "+(gi+1)+" ("+stufenText("wl",st)+", "+k+" Personen) passt nicht zusammen: "+
      (st==="stark"?"die längste Bank hat nur "+gr+" Plätze.":"höchstens "+gr+" Plätze hängen so zusammen."),"rule",g.id);
  });
  [["Auseinander",S.state.blacklist],["Zusammen",S.state.whitelist]].forEach(function(x){
    x[1].forEach(function(g,gi){
      if(g.members.length<2)h("info",x[0]+"-Gruppe "+(gi+1)+(g.members.length?" hat nur eine Person":" ist leer")+
        " und wirkt deshalb nicht.","rule",g.id);
    });
  });
  var res={n:n,pl:pl,H:H,warn:H.filter(function(x){return x.stufe==="warn";}).length};
  S.vpCache={sig:sig,res:res};
  return res;
}
export function offeneRegeln(){
  if(!S.letzteBewertung)return[];
  return S.letzteBewertung.issues.filter(function(i){return i.type!=="unplaced";});
}
