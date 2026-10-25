import { el, esc, uid } from "../core/basis.js";
import { allSeats } from "../core/geometrie.js";
import { sName } from "../core/regeln.js";
import { FARBE_RE, kurztext } from "../core/schema.js";
import { reindex } from "../core/zustand.js";
import { schritt } from "../io/speicher.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { klassenZaehler } from "./klasse-schueler.js";
import { ansage, confirmBox, toast } from "./meldungen.js";
import { personenFeld } from "./personenfeld.js";
import { ic } from "./symbole.js";

/* ---- Platzmerkmale ---- */
S.tagFokus=null;
export function buildTags(b){
  b.innerHTML='<div class="card"><div class="card-h">'+ic("tag")+"<h2>Platzmerkmale</h2>"+
    "<p>Merkmale beschreiben besondere Plätze – etwa „vorne“, „Fenster“, „Steckdose“. Im Raum weist du sie Plätzen zu; hier trägst du ein, wer so einen Platz braucht: Namen eintippen und aus der Liste wählen. Merkmale werden nie gedruckt.</p></div>"+
    '<div id="tagList"></div>'+
    '<div class="rowf" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">'+
      '<input type="text" id="ntName" placeholder="Neues Merkmal, z. B. vorne" aria-label="Name des neuen Merkmals" style="flex:1 1 220px">'+
      '<input type="color" id="ntColor" value="#326b7a" aria-label="Farbe des neuen Merkmals">'+
      '<button type="button" id="ntAdd" class="btn primary">'+ic("plus")+"Hinzufügen</button>"+
      '<button type="button" id="ntRoom" class="btn ghost">'+ic("room")+"Plätze im Raum markieren</button>"+
    "</div></div>";
  el("ntAdd").onclick=function(){
    var n=kurztext(el("ntName").value,40);
    if(!n){toast("Bitte einen Namen für das Merkmal eingeben.","w");return;}
    schritt("Platzmerkmal angelegt");
    S.state.tags.push({id:uid("tag"),name:n,color:el("ntColor").value});
    el("ntName").value="";drawTagList();klassenZaehler();
  };
  el("ntName").addEventListener("keydown",function(e){if(e.key==="Enter")el("ntAdd").click();});
  el("ntRoom").onclick=function(){showTab("room");};
  drawTagList();
}
function drawTagList(){
  var box=el("tagList");if(!box)return;
  if(!S.state.tags.length){box.innerHTML='<p class="muted" style="margin:0">Noch keine Platzmerkmale.</p>';return;}
  reindex();
  box.innerHTML="";
  var seats=allSeats();
  S.state.tags.forEach(function(t){
    var pl=seats.filter(function(s){return s.m.tags.indexOf(t.id)!==-1;}).length;
    var wuensche=S.state.students.filter(function(s){return s.requiredTags.indexOf(t.id)!==-1;}),wu=wuensche.length;
    var blk=document.createElement("div");blk.className="tagblock";blk.dataset.tag=t.id;
    var row=document.createElement("div");row.className="lrow2";
    row.innerHTML='<span class="swatch" style="background:'+t.color+'"></span>'+
      '<input type="text" value="'+esc(t.name)+'" aria-label="Name des Merkmals">'+
      '<input type="color" value="'+t.color+'" aria-label="Farbe von '+esc(t.name)+'">'+
      '<span class="meta">'+pl+(pl===1?" Platz":" Plätze")+" · "+wu+(wu===1?" Wunsch":" Wünsche")+
        (wu>pl?' <span class="badge warn" title="mehr Wünsche als markierte Plätze">'+ic("alert")+"zu wenig Plätze</span>":"")+"</span>"+
      '<button type="button" class="ib" title="Löschen" aria-label="Merkmal '+esc(t.name)+' löschen">'+ic("trash")+"</button>";
    row.querySelector("input[type=text]").onchange=function(){
      var n=kurztext(this.value,40);if(n&&n!==t.name){schritt("Merkmal umbenannt");t.name=n;}drawTagList();
    };
    row.querySelector("input[type=color]").onchange=function(){
      if(FARBE_RE.test(this.value)){schritt("Farbe geändert");t.color=this.value;}drawTagList();
    };
    row.querySelector(".ib").onclick=function(){
      confirmBox("Merkmal „"+t.name+"“ löschen? Es wird auch von allen Plätzen und Wünschen entfernt.",function(){
        schritt("Platzmerkmal gelöscht");
        S.state.tags=S.state.tags.filter(function(x){return x.id!==t.id;});
        Object.keys(S.state.seatMeta).forEach(function(k){
          S.state.seatMeta[k].tags=(S.state.seatMeta[k].tags||[]).filter(function(x){return x!==t.id;});
        });
        S.state.students.forEach(function(s){
          s.requiredTags=s.requiredTags.filter(function(x){return x!==t.id;});
        });
        drawTagList();klassenZaehler();
      },null,{ja:"Löschen",gefahr:true});
    };
    blk.appendChild(row);
    /* Wer braucht so einen Platz? Schnell per Autovervollständigung eintragen */
    var pers=document.createElement("div");pers.className="tagpers";
    pers.innerHTML='<span class="tp-lbl">Wunsch von</span><div class="tgl">'+(wu?wuensche.map(function(s){
      return '<button type="button" class="tg on" style="background:'+t.color+'" data-tpweg="'+esc(s.id)+'" aria-label="'+esc(sName(s.id))+
        " bei „"+esc(t.name)+'“ entfernen">'+esc(sName(s.id))+ic("x","sm")+"</button>";
    }).join(""):'<span class="muted" style="font-size:13.5px">noch niemand</span>')+"</div>";
    if(S.state.students.length){
      pers.appendChild(personenFeld({label:"Person zu „"+t.name+"“ hinzufügen",platzhalter:"Name eintippen …",
        ausschliessen:function(s){return s.requiredTags.indexOf(t.id)!==-1;},
        waehlen:function(s){
          schritt("Platzwunsch gesetzt");s.requiredTags.push(t.id);S.tagFokus={id:t.id,offen:true};drawTagList();
          ansage(sName(s.id)+" braucht jetzt einen Platz mit „"+t.name+"“.");
        }}));
    }else pers.insertAdjacentHTML("beforeend",'<span class="muted" style="font-size:13.5px">Lege zuerst Schüler:innen an.</span>');
    pers.querySelectorAll("[data-tpweg]").forEach(function(b){
      b.onclick=function(){
        var s=S.STU[b.dataset.tpweg];if(!s)return;
        schritt("Platzwunsch entfernt");s.requiredTags=s.requiredTags.filter(function(x){return x!==t.id;});
        S.tagFokus={id:t.id,offen:false};drawTagList();ansage(sName(s.id)+" entfernt.");
      };
    });
    blk.appendChild(pers);
    box.appendChild(blk);
  });
  if(S.tagFokus){
    var f=box.querySelector('.tagblock[data-tag="'+S.tagFokus.id+'"] .cbox input');
    if(f){if(!S.tagFokus.offen)S.cbLeise=true;f.focus();}
    S.tagFokus=null;
  }
}
