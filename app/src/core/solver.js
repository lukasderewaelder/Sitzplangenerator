import { rnd, shuffle } from "./basis.js";
import { buildAdj, cleanArrangement, usableSeats } from "./geometrie.js";
import { blackVerletzt, inAnyGroup, lehrerDaten, stufeVon, whiteVerbunden } from "./regeln.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { showTab } from "../ui/bereiche.js";
import { ansage, toast } from "../ui/meldungen.js";
import { renderAll } from "../ui/plan-status.js";
import { showReport } from "../ui/pruefbericht.js";

/* ===================== Bewertung ===================== */
var W={unplaced:10000,tag:4000,black:1000,solo:800,lehrer:600,white:200,gender:8,level:4};
/* Wer soll allein sitzen? Entweder alle (Modus) oder einzeln markierte Personen. */
export function mussAllein(stu){
  return S.state.options.solo==="all"||!!stu.solo;
}
/* Sitzgruppen: zusammenhängende Plätze über die Seiten-Nachbarschaft */
function sitzgruppen(seats,adj){
  var seen={},comps=[];
  seats.forEach(function(s){
    if(seen[s.key])return;
    var stack=[s.key],list=[];seen[s.key]=1;
    while(stack.length){
      var k=stack.pop();list.push(k);
      (adj.side[k]||[]).forEach(function(n){if(!seen[n]){seen[n]=1;stack.push(n);}});
    }
    comps.push(list);
  });
  return comps;
}
/* Obergrenze für Einzelplätze, wenn die Gruppe leer bleibt: jeder zweite Platz */
/* Für eine Sitzgruppe: wie viele sitzen höchstens allein, wenn p Personen darin sitzen? */
function gruppenBest(list,adj){
  var n=list.length,best=[],i,p;
  for(i=0;i<=n;i++)best.push(-1);
  if(n>16){ for(p=0;p<=n;p++)best[p]=Math.min(p,Math.ceil(n/2)); return best; }
  var idx={};list.forEach(function(k,j){idx[k]=j;});
  var nb=list.map(function(k){
    return (adj.side[k]||[]).filter(function(x){return idx[x]!==undefined;})
                            .map(function(x){return idx[x];});
  });
  for(var m=0;m<(1<<n);m++){
    var cnt=0,iso=0;
    for(i=0;i<n;i++){
      if(!(m&(1<<i)))continue;
      cnt++;
      var frei=true;
      for(var j=0;j<nb[i].length;j++)if(m&(1<<nb[i][j])){frei=false;break;}
      if(frei)iso++;
    }
    if(iso>best[cnt])best[cnt]=iso;
  }
  return best;
}
/* Exaktes Maximum: wie viele der anzahl Personen können überhaupt allein sitzen? */
export function maxAllein(seats,adj,anzahl){
  var dp=[0],i,p,q;
  for(i=1;i<=anzahl;i++)dp.push(-1);
  sitzgruppen(seats,adj).forEach(function(list){
    var best=gruppenBest(list,adj),next=[];
    for(i=0;i<=anzahl;i++)next.push(-1);
    for(p=0;p<=anzahl;p++){
      if(dp[p]<0)continue;
      for(q=0;q<best.length&&p+q<=anzahl;q++){
        if(best[q]<0)continue;
        if(dp[p]+best[q]>next[p+q])next[p+q]=dp[p]+best[q];
      }
    }
    dp=next;
  });
  for(p=anzahl;p>=0;p--)if(dp[p]>=0)return dp[p];
  return 0;
}
export function evaluate(arr,seats,adj){
  var pos={},i,j;
  Object.keys(arr).forEach(function(k){pos[arr[k]]=k;});
  var pen=0,issues=[];
  var byKey={};seats.forEach(function(s){byKey[s.key]=s;});

  S.state.students.forEach(function(s){
    if(!pos[s.id]){pen+=W.unplaced;issues.push({type:"unplaced",a:s.id});}
  });
  S.state.students.forEach(function(s){
    var k=pos[s.id];if(!k||!s.requiredTags.length)return;
    var st=byKey[k]?byKey[k].m.tags:[];
    var missing=s.requiredTags.filter(function(t){return st.indexOf(t)===-1;});
    if(missing.length){pen+=W.tag*missing.length;issues.push({type:"tag",a:s.id,tags:missing});}
  });
  S.state.blacklist.forEach(function(g){
    var st=stufeVon(g);
    for(i=0;i<g.members.length;i++)for(j=i+1;j<g.members.length;j++){
      var ka=pos[g.members[i]],kb=pos[g.members[j]];
      if(ka&&kb&&blackVerletzt(adj,st,ka,kb)){
        pen+=W.black;issues.push({type:"black",a:g.members[i],b:g.members[j],stufe:st,gid:g.id});
      }
    }
  });
  /* Einzelsitzen: niemand direkt daneben am selben Tisch */
  S.state.students.forEach(function(stu){
    if(!mussAllein(stu))return;
    var k=pos[stu.id];if(!k)return;
    var besetzt=(adj.side[k]||[]).some(function(nk){return arr[nk];});
    if(besetzt){pen+=W.solo;issues.push({type:"solo",a:stu.id});}
  });
  /* Nah am Lehrertisch: außerhalb des Umkreises ein Konflikt, innerhalb gilt: je näher, desto besser */
  if(adj.lehrer)S.state.students.forEach(function(stu){
    var ld=lehrerDaten(stu);if(!ld)return;
    var k=pos[stu.id];if(!k||adj.lehrer[k]===undefined)return;
    var d=adj.lehrer[k];
    if(d>ld.radius+1e-9){pen+=W.lehrer+Math.round(d*ld.nah);issues.push({type:"lehrer",a:stu.id});}
    else pen+=Math.round(d*ld.nah);
  });
  /* Whitelist und „alle einzeln“ schließen sich gegenseitig aus */
  if(S.state.options.solo!=="all")S.state.whitelist.forEach(function(g){
    var placed=g.members.filter(function(m){return pos[m];});
    pen+=W.white*(g.members.length-placed.length);
    if(placed.length<2)return;
    var st=stufeVon(g);
    var keys=placed.map(function(m){return pos[m];});
    var visited={},stack=[keys[0]];visited[keys[0]]=1;
    while(stack.length){
      var cur=stack.pop();
      keys.forEach(function(k2){
        if(!visited[k2]&&whiteVerbunden(adj,st,cur,k2)){visited[k2]=1;stack.push(k2);}
      });
    }
    keys.forEach(function(k){
      if(!visited[k]){pen+=W.white;issues.push({type:"white",a:arr[k],stufe:st,gid:g.id});}
    });
  });
  if(S.state.options.gender!=="off"||S.state.options.level!=="off"){
    var done={};
    seats.forEach(function(s){
      var sa=arr[s.key];if(!sa)return;
      (adj.side[s.key]||[]).forEach(function(nk){
        var pair=s.key<nk?s.key+"|"+nk:nk+"|"+s.key;
        if(done[pair])return;done[pair]=1;
        var sb=arr[nk];if(!sb)return;
        var A=S.STU[sa],B=S.STU[sb];if(!A||!B)return;
        if(S.state.options.gender!=="off"&&A.gender!=="x"&&B.gender!=="x"){
          var same=A.gender===B.gender;
          if(S.state.options.gender==="mix"&&same)pen+=W.gender;
          if(S.state.options.gender==="split"&&!same)pen+=W.gender;
        }
        if(S.state.options.level!=="off"){
          var d=Math.abs(A.level-B.level);
          if(S.state.options.level==="hetero")pen+=W.level*(2-d);
          if(S.state.options.level==="homo")pen+=W.level*d;
        }
      });
    });
  }
  return{pen:pen,issues:issues};
}
export function hardIssues(issues){
  return issues.filter(function(i){return i.type!=="soft";});
}

/* ===================== Anordnen ===================== */
function localScore(stu,k,arr,adj){
  var p=0;
  var allein=mussAllein(stu);
  var ldat=lehrerDaten(stu);
  if(ldat&&adj.lehrer&&adj.lehrer[k]!==undefined){
    var dl=adj.lehrer[k],f=ldat.nah*0.75;p+=dl>ldat.radius?150+dl*f:dl*f;
  }
  (adj.bench[k]||[]).forEach(function(nk){
    var o=arr[nk];if(!o)return;
    if(allein)p+=80;
    if(S.STU[o]&&mussAllein(S.STU[o]))p+=80;
    var B=S.STU[o];if(!B)return;
    if(S.state.options.gender==="mix"&&stu.gender!=="x"&&B.gender!=="x"&&stu.gender===B.gender)p+=2;
    if(S.state.options.gender==="split"&&stu.gender!=="x"&&B.gender!=="x"&&stu.gender!==B.gender)p+=2;
    var d=Math.abs(stu.level-B.level);
    if(S.state.options.level==="hetero")p+=(2-d);
    if(S.state.options.level==="homo")p+=d;
  });
  /* Regeln stufenabhängig vorbewerten */
  S.state.blacklist.forEach(function(g){
    if(g.members.indexOf(stu.id)===-1)return;
    var st=stufeVon(g);
    g.members.forEach(function(m){
      if(m===stu.id)return;
      var ko=null;
      Object.keys(arr).forEach(function(kk){if(arr[kk]===m)ko=kk;});
      if(ko&&blackVerletzt(adj,st,k,ko))p+=100;
    });
  });
  if(!allein&&S.state.options.solo!=="all")S.state.whitelist.forEach(function(g){
    if(g.members.indexOf(stu.id)===-1)return;
    var st=stufeVon(g);
    g.members.forEach(function(m){
      if(m===stu.id)return;
      var ko=null;
      Object.keys(arr).forEach(function(kk){if(arr[kk]===m)ko=kk;});
      if(ko&&whiteVerbunden(adj,st,k,ko))p-=30;
    });
  });
  return p;
}
function verbessern(start,startPen,freeKeys,seats,adj,steps){
  var cur=JSON.parse(JSON.stringify(start)),curPen=startPen;
  if(freeKeys.length>1){
    for(var it=0;it<steps&&curPen>0;it++){
      var k1=freeKeys[(rnd()*freeKeys.length)|0];
      var k2=freeKeys[(rnd()*freeKeys.length)|0];
      if(k1===k2)continue;
      var a=cur[k1],b=cur[k2];
      if(a===undefined&&b===undefined)continue;
      if(b===undefined)delete cur[k1];else cur[k1]=b;
      if(a===undefined)delete cur[k2];else cur[k2]=a;
      var p=evaluate(cur,seats,adj).pen;
      if(p<=curPen){curPen=p;}
      else{
        if(a===undefined)delete cur[k1];else cur[k1]=a;
        if(b===undefined)delete cur[k2];else cur[k2]=b;
      }
    }
  }
  return{arr:cur,pen:curPen};
}
export function generate(){
  if(S.tab!=="plan")showTab("plan");
  cleanArrangement();
  var seats=usableSeats();
  if(!seats.length){toast("Keine nutzbaren Plätze – bitte zuerst unter „Raum“ Tische aufstellen.","w");return;}
  if(!S.state.students.length){toast("Bitte zuerst unter „Klasse“ Schüler:innen anlegen.","w");return;}
  var adj=buildAdj(seats);
  var byKey={};seats.forEach(function(s){byKey[s.key]=s;});

  var lockedArr={},lockedStu={};
  seats.forEach(function(s){
    if(s.m.locked&&S.state.arrangement[s.key]){
      lockedArr[s.key]=S.state.arrangement[s.key];lockedStu[S.state.arrangement[s.key]]=1;
    }
  });
  var freeKeys=seats.filter(function(s){return !lockedArr[s.key];}).map(function(s){return s.key;});
  var pool=S.state.students.filter(function(s){return !lockedStu[s.id];});

  var bester=null,r;
  for(r=0;r<40;r++){
    var arr={};Object.keys(lockedArr).forEach(function(k){arr[k]=lockedArr[k];});
    var order=shuffle(pool).sort(function(a,b){
      var la=lehrerDaten(a),lb=lehrerDaten(b);
      var wa=(a.requiredTags.length?2:0)+(la&&adj.lehrer?la.start:0)+(inAnyGroup(a.id)?1:0);
      var wb=(b.requiredTags.length?2:0)+(lb&&adj.lehrer?lb.start:0)+(inAnyGroup(b.id)?1:0);
      return wb-wa;
    });
    order.forEach(function(stu){
      var cand=freeKeys.filter(function(k){return arr[k]===undefined;});
      if(!cand.length)return;
      if(stu.requiredTags.length){
        var ok=cand.filter(function(k){
          var t=byKey[k].m.tags;
          return stu.requiredTags.every(function(x){return t.indexOf(x)!==-1;});
        });
        if(ok.length)cand=ok;
      }
      var scored=cand.map(function(k){return{k:k,s:localScore(stu,k,arr,adj)};});
      var min=Infinity;scored.forEach(function(o){if(o.s<min)min=o.s;});
      var top=scored.filter(function(o){return o.s===min;});
      arr[top[(rnd()*top.length)|0].k]=stu.id;
    });
    var pen=evaluate(arr,seats,adj).pen;
    if(!bester||pen<bester.pen)bester={arr:arr,pen:pen};
    if(pen===0)break;                               /* fehlerfrei – fertig */
  }
  /* Lokale Verbesserung durch Platztausch */
  var steps=Math.min(3000,Math.max(600,freeKeys.length*100));
  var cur=verbessern(bester.arr,bester.pen,freeKeys,seats,adj,steps).arr;
  schritt("Neu angeordnet");
  S.state.arrangement=JSON.parse(JSON.stringify(cur));
  S.selected=null;
  renderAll();
  /* Nur melden, wenn etwas nicht erfüllt werden konnte */
  var res=evaluate(cur,seats,adj);
  var hinweis="";
  var gewuenscht=S.state.students.filter(mussAllein).length;
  if(gewuenscht){
    var moeglich=maxAllein(seats,adj,Math.min(S.state.students.length,seats.length));
    if(gewuenscht>moeglich){
      hinweis=(S.state.options.solo==="all"
        ? "Bei "+S.state.students.length+" Schüler:innen und diesem Raum können höchstens "+
          moeglich+" allein sitzen."
        : "Es sind "+gewuenscht+" Personen als Einzelplatz markiert, möglich sind bei dieser "+
          "Klassengröße aber nur "+moeglich+".")+
        " Mehr freie Plätze oder zusätzliche Tische schaffen Abhilfe.";
    }
  }
  if(S.beamer){
    /* vor der Klasse keine Namen und keine Regeln zeigen */
    toast(hardIssues(res.issues).length?"Neu angeordnet. Nicht alle Regeln ließen sich erfüllen – Details nach dem Beamer-Modus in der Prüfung.":"Neu angeordnet.");
    ansage("Neu angeordnet.");
    return;
  }
  if(hardIssues(res.issues).length)showReport(res,hinweis);
  else ansage("Angeordnet.");
}
