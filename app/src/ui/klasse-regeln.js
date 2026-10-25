import { confirmBox } from "./meldungen.js";
import { el, esc, uid } from "../core/basis.js";
import { ABSTAND, NAEHE } from "../core/konstanten.js";
import { sName, stufeVon } from "../core/regeln.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { klassenZaehler } from "./klasse-schueler.js";
import { ic } from "./symbole.js";

/* ===================== Regeln: Auseinander setzen / Zusammen setzen ===================== */
export var gruppeOffen={};
export function buildRules(b){
  if(S.state.students.length<2){
    b.innerHTML='<div class="card"><div class="empty">'+ic("split","lg")+'<strong style="color:var(--text);font-size:16px">Noch keine Regeln möglich</strong>'+
      "<span>Regeln brauchen mindestens zwei Schüler:innen. Lege sie unter „Schüler:innen“ an.</span></div></div>";
    return;
  }
  b.innerHTML=
    '<div class="card"><div class="card-h">'+ic("split")+"<h2>Auseinander setzen</h2><span class=\"spacer\"></span>"+
      '<button type="button" id="blAdd" class="btn">'+ic("plus")+"Neue Gruppe</button>"+
      "<p>Diese Personen sollen nicht nah beieinander sitzen. Der Abstand legt fest, wie weit auseinander.</p></div>"+
      '<div id="blBox"></div></div>'+
    '<div class="card"><div class="card-h">'+ic("link")+"<h2>Zusammen setzen</h2><span class=\"spacer\"></span>"+
      '<button type="button" id="wlAdd" class="btn">'+ic("plus")+"Neue Gruppe</button>"+
      "<p>Diese Personen sollen nah beieinander sitzen. Die Nähe legt fest, wie eng.</p></div>"+
      '<div id="wlBox"></div></div>';
  el("blAdd").onclick=function(){schritt("Auseinander-Gruppe angelegt");var g={id:uid("g"),members:[],level:"moderat"};gruppeOffen[g.id]=1;S.state.blacklist.push(g);drawGroups();klassenZaehler();};
  el("wlAdd").onclick=function(){schritt("Zusammen-Gruppe angelegt");var g={id:uid("g"),members:[],level:"moderat"};gruppeOffen[g.id]=1;S.state.whitelist.push(g);drawGroups();klassenZaehler();};
  drawGroups();
}
var STUFEN_TEXT={
  bl:{stark:"Abstand groß – kein Kontakt im Umfeld: nicht nebeneinander (auch nicht über den Gang), nicht vor- oder hintereinander, nicht schräg.",
      moderat:"Abstand mittel – nicht direkt nebeneinander und nicht direkt vor- oder hintereinander. Über den Gang hinweg oder schräg ist erlaubt.",
      schwach:"Abstand klein – nur nicht direkt nebeneinander auf derselben Bank."},
  wl:{stark:"Gleiche Bank – direkt nebeneinander am selben Tisch.",
      moderat:"Nebeneinander – direkt nebeneinander, auch über den Gang hinweg.",
      schwach:"In der Nähe – auch schräg oder vor- bzw. hintereinander."}
};
var STUFEN_REIHE={bl:["schwach","moderat","stark"],wl:["stark","moderat","schwach"]};
export function drawGroups(){
  [["blBox",S.state.blacklist,"bl"],["wlBox",S.state.whitelist,"wl"]].forEach(function(cfg){
    var box=el(cfg[0]);if(!box)return;
    var list=cfg[1],art=cfg[2],farbe=art==="bl"?"var(--danger)":"var(--sel)";
    if(!list.length){box.innerHTML='<p class="muted" style="margin:0">Noch keine Gruppe.</p>';return;}
    box.innerHTML="";
    list.forEach(function(g,gi){
      var d=document.createElement("div");
      d.className="grp";
      d.dataset.gid=g.id;
      d.setAttribute("role","group");
      d.setAttribute("aria-label",(art==="bl"?"Auseinander":"Zusammen")+"-Gruppe "+(gi+1));
      var st=stufeVon(g);
      var head='<div class="grp-h"><strong>Gruppe '+(gi+1)+'</strong><span class="count">'+g.members.length+"</span>"+
        '<span class="spacer"></span><span class="muted" style="font-size:13px">'+(art==="bl"?"Abstand":"Nähe")+"</span>"+
        '<div class="seg sm" role="group" aria-label="'+(art==="bl"?"Abstand":"Nähe")+' der Gruppe '+(gi+1)+'">'+
        STUFEN_REIHE[art].map(function(x){
          var lab=art==="bl"?ABSTAND[x]:NAEHE[x];
          return '<button type="button" data-stufe="'+x+'" aria-pressed="'+(st===x?"true":"false")+'">'+lab+"</button>";
        }).join("")+"</div>"+
        '<button type="button" class="ib" title="Gruppe löschen" aria-label="Gruppe '+(gi+1)+' löschen">'+ic("trash")+"</button></div>"+
        '<div class="grp-erkl">'+esc(STUFEN_TEXT[art][st])+"</div>";
      var mit=g.members.filter(function(m){return S.STU[m];});
      var chips='<div class="tgl">'+mit.map(function(m){
        return '<button type="button" class="tg on" style="background:'+farbe+'" data-weg="'+esc(m)+'" aria-label="'+esc(sName(m))+' aus der Gruppe entfernen">'+
          esc(sName(m))+ic("x","sm")+"</button>";
      }).join("")+
        '<button type="button" class="tg" data-pick aria-expanded="'+(gruppeOffen[g.id]?"true":"false")+'">'+ic(gruppeOffen[g.id]?"chevD":"plus","sm")+
        (gruppeOffen[g.id]?"Auswahl schließen":"Personen auswählen")+"</button></div>";
      if(mit.length<2)chips+='<p class="hint" style="margin:8px 0 0">Eine Gruppe wirkt erst ab zwei Personen.</p>';
      var pick="";
      if(gruppeOffen[g.id]){
        pick='<div class="grp-pick"><div class="tgl">'+S.state.students.map(function(s){
          var on=g.members.indexOf(s.id)!==-1;
          return '<button type="button" class="tg'+(on?" on":"")+'" data-toggle="'+esc(s.id)+'" aria-pressed="'+(on?"true":"false")+'"'+
            (on?' style="background:'+farbe+'"':"")+">"+(on?ic("check","sm"):"")+esc(s.name)+"</button>";
        }).join("")+"</div></div>";
      }
      d.innerHTML=head+chips+pick;
      d.querySelectorAll("[data-stufe]").forEach(function(b){
        b.onclick=function(){
          if(b.dataset.stufe===g.level)return;
          schritt(art==="bl"?"Abstand geändert":"Nähe geändert");g.level=b.dataset.stufe;drawGroups();
          var z=document.querySelector('[data-gid="'+g.id+'"] [data-stufe="'+g.level+'"]');if(z)z.focus();
        };
      });
      d.querySelector(".ib").onclick=function(){
        confirmBox("Gruppe "+(gi+1)+" löschen?",function(){schritt("Gruppe gelöscht");list.splice(gi,1);drawGroups();klassenZaehler();},null,{ja:"Löschen",gefahr:true});
      };
      d.querySelector("[data-pick]").onclick=function(){
        if(gruppeOffen[g.id])delete gruppeOffen[g.id];else gruppeOffen[g.id]=1;
        drawGroups();
        var z=document.querySelector('[data-gid="'+g.id+'"] [data-pick]');if(z)z.focus();
      };
      function umschalten(id){
        var i=g.members.indexOf(id);
        schritt(i===-1?"Person zur Gruppe hinzugefügt":"Person aus Gruppe entfernt");
        if(i===-1)g.members.push(id);else g.members.splice(i,1);
        drawGroups();
      }
      d.querySelectorAll("[data-weg]").forEach(function(b){b.onclick=function(){umschalten(b.dataset.weg);};});
      d.querySelectorAll("[data-toggle]").forEach(function(b){
        b.onclick=function(){
          umschalten(b.dataset.toggle);
          var z=document.querySelector('[data-gid="'+g.id+'"] [data-toggle="'+b.dataset.toggle+'"]');if(z)z.focus();
        };
      });
      box.appendChild(d);
    });
  });
}
