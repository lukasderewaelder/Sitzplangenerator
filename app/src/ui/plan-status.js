import { el, esc } from "../core/basis.js";
import { cleanArrangement, meta } from "../core/geometrie.js";
import { GENDERS, LEVELS, stufenText } from "../core/konstanten.js";
import { hatLehrertisch, lehrerText, sName, stufeVon, tagById } from "../core/regeln.js";
import { offeneRegeln, vorpruefung } from "../core/vorpruefung.js";
import { save, schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { ansage, toast } from "./meldungen.js";
import { renderRoom } from "./plan-ansicht.js";
import { dndStart, fixierenUmschalten } from "./plan-dnd.js";
import { aktionAusfuehren, konfliktZeile, nachKlasse, pruefDialog, zeigeImPlan, zuPerson } from "./pruefbericht.js";
import { openSeatMenu } from "./raum-panels.js";
import { ic } from "./symbole.js";

/* ===================== Statusleiste, Auswahl-Bereich und Zoom ===================== */
function klasseOffen(){return !S.state.security.hash||S.unlocked;}
export function schmal(px){return window.matchMedia?window.matchMedia("(max-width:"+px+"px)").matches:window.innerWidth<=px;}
export function renderSide(){
  var placed={};Object.keys(S.state.arrangement).forEach(function(k){placed[S.state.arrangement[k]]=1;});
  var up=S.state.students.filter(function(s){return !placed[s.id];});
  var c=el("unplaced");c.innerHTML="";
  el("upCount").textContent=up.length;
  if(!S.state.students.length)c.innerHTML='<p class="muted" style="margin:0">Noch keine Schüler:innen.</p>';
  else if(!up.length)c.innerHTML='<div class="empty-ok">'+ic("checkCircle")+"Alle haben einen Platz.</div>";
  else up.forEach(function(s){
    var an=!!(S.selected&&S.selected.kind==="pool"&&S.selected.studentId===s.id);
    var b=document.createElement("button");
    b.type="button";
    b.className="chip"+(an?" on":"");
    b.textContent=sName(s.id);
    b.setAttribute("aria-pressed",an?"true":"false");
    b.onclick=function(e){
      if(S.justDragged){S.justDragged=false;return;}
      S.selected=(S.selected&&S.selected.kind==="pool"&&S.selected.studentId===s.id)?null:{kind:"pool",studentId:s.id};
      renderRoom();renderSide();
      if(S.selected&&schmal(1279))statusOeffnen(false);
      if(S.selected&&e&&e.detail===0){           /* per Tastatur gewählt: gleich zum ersten freien Platz */
        var frei=null;
        document.querySelectorAll("#room .seat:not(.blocked)").forEach(function(n){
          if(!frei&&S.state.arrangement[n.dataset.k]===undefined)frei=n;
        });
        (frei||document.querySelector("#room .seat:not(.blocked)")||{focus:function(){}}).focus();
        ansage(sName(s.id)+" ausgewählt. Zielplatz wählen und Eingabe drücken.");
      }
    };
    b.addEventListener("pointerdown",function(e){
      if(e.button&&e.button!==0)return;
      dndStart(e,{kind:"pool",studentId:s.id});
    });
    c.appendChild(b);
  });

  /* Legende */
  var lg="";
  lg+='<div class="lrow"><span class="sw" style="background:var(--danger-soft);border-color:var(--danger)"></span>zu nah (Auseinander setzen)</div>';
  lg+='<div class="lrow"><span class="sw" style="border-color:var(--warn);border-style:dashed"></span>Zusammen setzen, Platzwunsch oder Lehrertisch offen</div>';
  if(S.state.options.solo==="all"||S.state.students.some(function(x){return x.solo;}))
    lg+='<div class="lrow"><span class="sw" style="background:var(--warn-soft);border-color:var(--warn)"></span>sitzt nicht allein</div>';
  lg+='<div class="lrow"><span class="sw" style="border-color:var(--sel);box-shadow:0 0 0 2px var(--sel-soft)"></span>ausgewählt</div>';
  lg+='<div class="lrow">'+ic("pin","sm")+"Platz fixiert</div>";
  if(S.state.tags.length){
    lg+='<div class="lrow" style="margin-top:4px;font-weight:600;color:var(--text)">Platzmerkmale</div>';
    S.state.tags.forEach(function(t){
      lg+='<div class="lrow"><span class="tagdot" style="background:'+t.color+'"></span>'+esc(t.name)+"</div>";
    });
  }
  if(S.view==="teacher"&&S.state.options.showGender){
    lg+='<div class="lrow" style="margin-top:4px;font-weight:600;color:var(--text)">Geschlecht</div>';
    ["w","m","d"].forEach(function(g){
      lg+='<div class="lrow"><span class="gdot" style="background:'+GENDERS[g].color+'"></span>'+GENDERS[g].label+"</div>";
    });
  }
  el("legend").innerHTML=lg;

  /* Anzeige-Schalter: nur änderbar, wenn die Klasse nicht gesperrt ist */
  var frei=klasseOffen();
  var opt=[["showNotes","Hinweise"],["showGender","Geschlecht"],["showLevel","Leistungsstärke"]];
  var oh=opt.map(function(o){
    return '<label class="sw-row'+(frei?"":" locked")+'"><input type="checkbox" data-opt="'+o[0]+'"'+
      (S.state.options[o[0]]?" checked":"")+(frei?"":" disabled")+"> "+o[1]+"</label>";
  }).join("");
  oh+='<p class="muted" style="margin:6px 0 0;font-size:13px">'+(frei
    ?"Nur in der Lehrersicht und auf dem Lehrerblatt – nie auf dem Blatt für die Klasse."
    :ic("lock","sm")+" Gesperrt – änderbar nach dem Entsperren unter „Klasse“.")+"</p>";
  el("optSummary").innerHTML=oh;
  el("optSummary").querySelectorAll("input[data-opt]").forEach(function(inp){
    inp.onchange=function(){
      if(!klasseOffen()){this.checked=!!S.state.options[this.dataset.opt];return;}
      schritt("Anzeige geändert");
      S.state.options[this.dataset.opt]=this.checked;renderAll();
    };
  });

  el("viewLabel").textContent=S.beamer?"Sitzplan – Blick nach vorn zur Tafel":(S.view==="teacher"
    ? "Lehrersicht · Blick von der Tafel in die Klasse"
    : "Schülersicht · Blick von hinten nach vorn zur Tafel");
  ["vTeacher","vStudent"].forEach(function(id){
    var an=(id==="vTeacher")===(S.view==="teacher");
    el(id).classList.toggle("on",an);
    el(id).setAttribute("aria-pressed",an?"true":"false");
  });
  var gesperrt=!!(S.state.security.hash&&!S.unlocked);
  el("tabLock").hidden=!gesperrt;
  el("btnLockTxt").textContent=S.state.security.hash?(S.unlocked?"Klasse sperren":"Klasse ist gesperrt"):"Klasse sperren";
  renderPlanStatus();
  renderInspector();
}
export function renderAll(){cleanArrangement();renderRoom();renderSide();save();}

/* ---- Überblick links: Platzierung, Prüfung, klickbare Kennzahlen ---- */
function renderPlanStatus(){
  var box=el("statusBox");if(!box)return;
  var vp=vorpruefung(),konf=offeneRegeln().length;
  var n=vp.n,platziert=Object.keys(S.state.arrangement).length;
  var fixIds=[];
  Object.keys(S.state.arrangement).forEach(function(k){if(S.state.seatMeta[k]&&S.state.seatMeta[k].locked)fixIds.push(S.state.arrangement[k]);});
  var nBl=S.state.blacklist.filter(function(g){return g.members.length>1;}).length;
  var nWl=S.state.whitelist.filter(function(g){return g.members.length>1;}).length;
  var kl,titel,sub,icn;
  if(!n||!vp.pl){kl="warn";icn="info";titel="Einrichtung unvollständig";sub=!n?"Noch keine Schüler:innen":"Noch keine Plätze";}
  else if(!platziert&&vp.warn){kl="warn";icn="alert";titel=vp.warn+(vp.warn===1?" Hinweis":" Hinweise")+" vor dem Anordnen";sub="Antippen für Details";}
  else if(!platziert){kl="ok";icn="checkCircle";titel="Bereit zum Anordnen";sub="Keine Auffälligkeiten";}
  else if(konf){kl="bad";icn="alert";titel=konf+(konf===1?" offene Regel":" offene Regeln");sub="Antippen zum Lösen";}
  else if(platziert<n){kl="warn";icn="alert";titel=(n-platziert)+" ohne Platz";sub="Antippen für Details";}
  else{kl="ok";icn="checkCircle";titel="Alle Regeln erfüllt";sub=vp.warn?vp.warn+(vp.warn===1?" Hinweis":" Hinweise")+" zur Einrichtung":"Plan ist fertig";}
  function li(go,icon,text,extra){
    return '<li><button type="button" data-go="'+go+'"'+(extra?' class="'+extra+'"':"")+">"+ic(icon)+"<span>"+text+"</span></button></li>";
  }
  box.innerHTML=
    '<div class="sp-big"><span class="num">'+platziert+" / "+n+'</span><span class="lab">platziert</span></div>'+
    '<button id="preStatus" class="prestat '+kl+'" type="button" title="Prüfung öffnen">'+ic(icn)+
      "<span>"+esc(titel)+'<span class="pre-sub">'+esc(sub)+"</span></span>"+ic("chevR","sm chev")+"</button>"+
    '<ul class="sp-list">'+
      li("class","users",'<span class="num">'+n+"</span> Schüler:innen")+
      li("room","grid",'<span class="num">'+vp.pl+"</span> Plätze")+
      li("fix","pin",'<span class="num">'+fixIds.length+"</span> fixiert")+
      li("bl","split",'<span class="num">'+nBl+"</span> "+(nBl===1?"Auseinander-Gruppe":"Auseinander-Gruppen"))+
      li("wl","link",'<span class="num">'+nWl+"</span> "+(nWl===1?"Zusammen-Gruppe":"Zusammen-Gruppen"))+
      li("konf","alert",konf?'<span class="num">'+konf+"</span> "+(konf===1?"Konflikt":"Konflikte"):"Keine Konflikte",konf?"bad":"")+
    "</ul>";
  el("preStatus").onclick=pruefDialog;
  box.querySelectorAll("[data-go]").forEach(function(b){
    b.onclick=function(){
      var go=b.dataset.go;
      if(schmal(1279))statusOeffnen(false);
      if(go==="class")nachKlasse(function(){},"schueler");
      else if(go==="room")showTab("room");
      else if(go==="fix"){if(fixIds.length)zeigeImPlan(fixIds);else toast("Es ist kein Platz fixiert. Fixieren: Platz antippen und rechts „Platz fixieren“ wählen.");}
      else if(go==="bl"||go==="wl")nachKlasse(function(){},"regeln");
      else pruefDialog();
    };
  });
  el("statusKurz").textContent=platziert+"/"+n+(konf?" · "+konf+" offen":"");
}
export function statusOeffnen(an){
  var w=el("tabPlan");if(!w)return;
  w.classList.toggle("sp-open",!!an);
  el("btnStatus").setAttribute("aria-expanded",an?"true":"false");
  if(an)setTimeout(function(){var f=el("spClose");if(f)f.focus();},60);
}

/* ---- Auswahl-Bereich rechts (auf schmalen Geräten als Blatt von unten) ---- */
function platzInfo(k){
  var pos=k.lastIndexOf("#"),tid=k.slice(0,pos),idx=parseInt(k.slice(pos+1),10),nr=0,t=null;
  S.state.tables.forEach(function(x,i){if(x.id===tid){nr=i+1;t=x;}});
  return{tid:tid,idx:idx,nr:nr,seats:t?t.seats:0};
}
function regelnVon(id){
  var out=[];
  [["bl",S.state.blacklist],["wl",S.state.whitelist]].forEach(function(x){
    x[1].forEach(function(g,gi){
      if(g.members.length<2||g.members.indexOf(id)===-1)return;
      out.push({art:x[0],nr:gi+1,g:g,andere:g.members.filter(function(m){return m!==id&&S.STU[m];}).map(sName)});
    });
  });
  return out;
}
function renderInspector(){
  var p=el("inspector"),ws=el("tabPlan");if(!p)return;
  if(S.beamer){p.innerHTML="";ws.classList.remove("has-sel");return;}
  var sel=S.selected,h="",offen=klasseOffen(),details=offen&&S.view==="teacher";
  var res=S.letzteBewertung,probleme={};
  if(res)res.issues.forEach(function(i){
    (probleme[i.a]=probleme[i.a]||[]).push(i);
    if(i.b)(probleme[i.b]=probleme[i.b]||[]).push(i);
  });
  function aktion(id,icon,text,extra){
    return '<button type="button" class="btn'+(extra?" "+extra:"")+'" data-insp="'+id+'">'+ic(icon)+"<span>"+text+"</span></button>";
  }
  if(sel&&sel.kind==="seat"){
    var k=sel.key,sid=S.state.arrangement[k],m=meta(k),pi=platzInfo(k);
    h+='<div class="insp-kicker">'+(sid?"Ausgewählte Person":"Ausgewählter Platz")+"</div>"+
      '<div class="insp-title">'+(sid?esc(sName(sid)):"Freier Platz")+"</div>"+
      '<div class="insp-sub">Tisch '+pi.nr+" · Platz "+(pi.idx+1)+" von "+pi.seats+"</div>";
    var bd="";
    if(m.locked)bd+='<span class="badge sel">'+ic("pin")+"fixiert</span>";
    (m.tags||[]).forEach(function(tid){var t=tagById(tid);if(t)bd+='<span class="badge"><span class="tagdot" style="background:'+t.color+'"></span>'+esc(t.name)+"</span>";});
    if(sid&&probleme[sid])probleme[sid].forEach(function(i){
      if(i.type==="black")bd+='<span class="badge bad">'+ic("split")+"zu nah an "+esc(sName(i.a===sid?i.b:i.a))+"</span>";
      else if(i.type==="white")bd+='<span class="badge warn">'+ic("link")+"nicht bei der Gruppe</span>";
      else if(i.type==="tag")bd+='<span class="badge warn">'+ic("tag")+"Platzwunsch offen</span>";
      else if(i.type==="solo")bd+='<span class="badge warn">'+ic("user")+"sitzt nicht allein</span>";
      else if(i.type==="lehrer")bd+='<span class="badge warn">'+ic("desk")+"zu weit vom Lehrertisch</span>";
    });
    if(bd)h+='<div class="badges" style="margin-top:12px">'+bd+"</div>";
    h+='<div class="callout" style="margin-top:14px">'+ic("info")+"<span>"+(sid
      ?"Zum Tauschen jetzt den Zielplatz antippen – oder den Namen direkt dorthin ziehen."
      :"Tippe eine Person unter „Nicht platziert“ oder einen belegten Platz an, um sie hierher zu setzen.")+"</span></div>";
    if(sid&&S.STU[sid]){
      var stu=S.STU[sid];
      if(details){
        var kv='<dl class="kv">';
        kv+="<dt>Geschlecht</dt><dd>"+esc(GENDERS[stu.gender].label)+"</dd>";
        kv+="<dt>Leistung</dt><dd>"+esc(LEVELS[stu.level])+"</dd>";
        if(stu.solo)kv+="<dt>Sitzen</dt><dd>allein</dd>";
        if(stu.lehrer)kv+="<dt>Platz</dt><dd>nah am Lehrertisch ("+esc(lehrerText(stu))+")"+(hatLehrertisch()?"":" – ruht, kein Lehrertisch im Raum")+"</dd>";
        if(stu.requiredTags.length)kv+="<dt>Platzwunsch</dt><dd>"+esc(stu.requiredTags.map(function(t){var x=tagById(t);return x?x.name:"";}).filter(Boolean).join(", "))+"</dd>";
        if(stu.note)kv+="<dt>Hinweis</dt><dd>"+esc(stu.note)+"</dd>";
        kv+="</dl>";
        h+='<div class="insp-sec" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Angaben</div>'+kv+"</div>";
        var rg=regelnVon(sid);
        if(rg.length){
          h+='<div class="insp-sec" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)"><div class="insp-h">Regeln</div><div class="legend" style="color:var(--text);font-size:14px">';
          rg.forEach(function(r){
            h+='<div class="lrow">'+ic(r.art==="bl"?"split":"link","sm")+"<span>"+(r.art==="bl"?"Auseinander von ":"Zusammen mit ")+
              esc(r.andere.join(", "))+' <span class="muted" style="font-size:12.5px">· '+esc(stufenText(r.art,stufeVon(r.g)))+"</span></span></div>";
          });
          h+="</div></div>";
        }
      }else if(!offen){
        h+='<p class="muted" style="margin-top:16px;display:flex;gap:8px;align-items:center">'+ic("lock","sm")+"Angaben und Regeln sind gesperrt.</p>";
      }
    }
    h+='<div class="insp-actions">';
    if(sid)h+=aktion("fix","pin",m.locked?"Fixierung lösen":"Platz fixieren");
    if(sid)h+=aktion("weg","x","Vom Platz nehmen");
    if(sid)h+=aktion("person","user","In der Klassenliste öffnen");
    h+=aktion("raum","tag","Platz im Raum bearbeiten","ghost");
    h+=aktion("aus","x","Auswahl aufheben","ghost");
    h+="</div>";
  }else if(sel&&sel.kind==="pool"){
    h+='<div class="insp-kicker">Ausgewählte Person</div>'+
      '<div class="insp-title">'+esc(sName(sel.studentId))+"</div>"+
      '<div class="insp-sub">noch ohne Platz</div>'+
      '<div class="callout" style="margin-top:14px">'+ic("info")+"<span>Tippe den Platz an, auf den "+esc(sName(sel.studentId))+
      " soll. Ist er besetzt, wandert die Person dort nach „Nicht platziert“.</span></div>"+
      '<div class="insp-actions">'+aktion("person","user","In der Klassenliste öffnen")+aktion("aus","x","Auswahl aufheben","ghost")+"</div>";
  }else{
    h+='<div class="insp-kicker">Auswahl</div>'+
      '<div class="empty">'+ic("seat","lg")+'<strong style="color:var(--text);font-size:16px">Kein Platz ausgewählt</strong>'+
      "<span>Tippe auf einen Platz, um Details zu sehen und Personen zu tauschen. Namen lassen sich auch direkt ziehen.</span></div>";
    var konf=offeneRegeln().filter(function(i){return i.type!=="soft";});
    if(konf.length){
      h+='<div class="insp-sec" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Offene Regeln ('+konf.length+")</div>";
      if(offen)h+='<div class="report">'+konf.slice(0,8).map(konfliktZeile).join("")+"</div>"+
        (konf.length>8?'<p class="muted" style="margin-top:8px">… und '+(konf.length-8)+" weitere in der Prüfung.</p>":"");
      else h+='<p class="muted">Die Details stehen in der Prüfung (Statusleiste links).</p>';
      h+="</div>";
    }
    h+='<div class="insp-sec" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)"><div class="insp-h">Tastatur</div>'+
      '<p class="muted" style="margin:0">Pfeiltasten wandern von Platz zu Platz, Eingabe wählt aus und tauscht, F fixiert, Entf nimmt vom Platz.</p></div>';
  }
  p.innerHTML=h;
  ws.classList.toggle("has-sel",!!sel);
}
/* ein gemeinsamer Klick-Verteiler für den Auswahl-Bereich */
el("inspector").addEventListener("click",function(e){
  var b=e.target.closest?e.target.closest("[data-insp],[data-aktion]"):null;
  if(!b)return;
  if(b.hasAttribute("data-aktion")){aktionAusfuehren(b.getAttribute("data-aktion"),b.getAttribute("data-arg"));return;}
  var a=b.getAttribute("data-insp"),sel=S.selected;
  if(a==="aus"){S.selected=null;renderAll();return;}
  if(!sel)return;
  if(sel.kind==="seat"){
    var k=sel.key,sid=S.state.arrangement[k];
    if(a==="fix"){S.raumFokus=null;fixierenUmschalten(k);}
    else if(a==="weg"&&sid!==undefined){
      if(meta(k).locked){toast("Dieser Platz ist fixiert. Erst die Fixierung lösen.","w");return;}
      schritt("Person vom Platz genommen");
      delete S.state.arrangement[k];S.selected=null;renderAll();
      ansage(sName(sid)+" steht jetzt unter „Nicht platziert“.");
    }else if(a==="person"&&sid!==undefined)zuPerson(sid);
    else if(a==="raum"){var pi=platzInfo(k);S.selected=null;showTab("room");openSeatMenu(pi.tid,pi.idx);}
  }else if(sel.kind==="pool"&&a==="person")zuPerson(sel.studentId);
});
