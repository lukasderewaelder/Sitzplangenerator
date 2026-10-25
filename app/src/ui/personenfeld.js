import { esc } from "../core/basis.js";
import { S } from "../store.js";
import { toast } from "./meldungen.js";

/* ---- Eingabefeld mit Vorschlagsliste (Autovervollständigung) für Personen ---- */
S.cbZaehler=0;
S.cbLeise=false;
export function personenFeld(o){
  var id="cb"+(++S.cbZaehlerer);
  var w=document.createElement("div");w.className="cbox";
  w.innerHTML='<input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="'+id+'_l" autocomplete="off"'+
    ' placeholder="'+esc(o.platzhalter||"Name eingeben …")+'" aria-label="'+esc(o.label)+'">'+
    '<ul class="cbox-list" id="'+id+'_l" role="listbox" aria-label="Vorschläge" hidden></ul>';
  var inp=w.firstChild,lst=w.lastChild,treffer=[],akt=-1;
  function kandidaten(){
    var q=inp.value.trim().toLowerCase(),r=[];
    S.state.students.forEach(function(s){
      if(o.ausschliessen(s))return;
      var voll=s.name.toLowerCase(),anz=(S.ANZEIGE[s.id]||"").toLowerCase(),rang;
      if(!q)rang=2;
      else if(s.vorname.toLowerCase().indexOf(q)===0||s.nachname.toLowerCase().indexOf(q)===0||voll.indexOf(q)===0)rang=0;
      else if(voll.indexOf(q)!==-1||anz.indexOf(q)!==-1)rang=1;
      else return;
      r.push({s:s,r:rang});
    });
    r.sort(function(a,b){return a.r-b.r||a.s.name.localeCompare(b.s.name,"de",{sensitivity:"base"});});
    return r.slice(0,8).map(function(x){return x.s;});
  }
  function markiere(n){
    var q=inp.value.trim();
    if(!q)return esc(n);
    var i=n.toLowerCase().indexOf(q.toLowerCase());
    if(i<0)return esc(n);
    return esc(n.slice(0,i))+"<mark>"+esc(n.slice(i,i+q.length))+"</mark>"+esc(n.slice(i+q.length));
  }
  function aktiv(){
    lst.querySelectorAll("li[data-i]").forEach(function(li){
      var an=+li.dataset.i===akt;li.classList.toggle("akt",an);li.setAttribute("aria-selected",an?"true":"false");
      if(an)li.scrollIntoView({block:"nearest"});
    });
    if(akt>=0)inp.setAttribute("aria-activedescendant",id+"_o"+akt);else inp.removeAttribute("aria-activedescendant");
  }
  function zeigen(){
    treffer=kandidaten();akt=treffer.length?0:-1;
    lst.innerHTML=treffer.length?treffer.map(function(s,i){
      return '<li role="option" id="'+id+"_o"+i+'" data-i="'+i+'">'+markiere(s.name)+"</li>";
    }).join(""):'<li class="cbox-leer" role="option" aria-disabled="true">'+(inp.value.trim()?"Keine passende Person":"Alle sind schon zugeordnet")+"</li>";
    lst.hidden=false;inp.setAttribute("aria-expanded","true");aktiv();
  }
  function zu(){lst.hidden=true;inp.setAttribute("aria-expanded","false");inp.removeAttribute("aria-activedescendant");}
  function nimm(i){var s=treffer[i];if(!s)return;inp.value="";zu();o.waehlen(s);}
  inp.addEventListener("input",zeigen);
  inp.addEventListener("focus",function(){if(S.cbLeise){S.cbLeise=false;return;}zeigen();});
  inp.addEventListener("click",function(){if(lst.hidden)zeigen();});
  inp.addEventListener("keydown",function(e){
    if(e.key==="ArrowDown"){e.preventDefault();if(lst.hidden)zeigen();else if(treffer.length){akt=(akt+1)%treffer.length;aktiv();}}
    else if(e.key==="ArrowUp"){e.preventDefault();if(!lst.hidden&&treffer.length){akt=(akt-1+treffer.length)%treffer.length;aktiv();}}
    else if(e.key==="Enter"){
      e.preventDefault();
      if(!lst.hidden&&akt>=0)nimm(akt);
      else if(inp.value.trim())toast("Keine passende Person gefunden.","w");
    }
    else if(e.key==="Escape"){if(!lst.hidden){e.preventDefault();e.stopPropagation();zu();}}
    else if(e.key==="Tab")zu();
  });
  inp.addEventListener("blur",function(){setTimeout(function(){if(document.activeElement!==inp)zu();},150);});
  lst.addEventListener("mousedown",function(e){
    var li=e.target.closest?e.target.closest("li[data-i]"):null;
    if(li){e.preventDefault();nimm(+li.dataset.i);}
  });
  return w;
}
