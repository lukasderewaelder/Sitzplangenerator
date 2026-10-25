import { S } from "../store.js";
import { furniture } from "../ui/plan-ansicht.js";

/* „Nah am Lehrertisch“ in zwei Stufen: Umkreis in Feldern, gemessen von der Platzmitte zum Lehrertisch */
export var LEHRER_STUFEN={standard:{radius:4,name:"Standard",nah:4,start:2},weich:{radius:6,name:"weich",nah:2,start:1}};
/* ältere Pläne speichern true – das ist die Standard-Stufe */
export function lehrerStufe(v){return(v===true||v==="standard")?"standard":(v==="weich"?"weich":false);}
export function lehrerDaten(stu){var st=lehrerStufe(stu&&stu.lehrer);return st?LEHRER_STUFEN[st]:null;}
export function lehrerText(stu){
  var d=lehrerDaten(stu);if(!d)return"";
  return d===LEHRER_STUFEN.weich?"weich · Umkreis "+d.radius+" Felder":"Standard · Umkreis "+d.radius+" Felder";
}
export function hatLehrertisch(){return furniture().some(function(f){return f.type==="desk";});}
export function lehrerRegelAnzahl(){return S.state.students.filter(function(s){return s.lehrer;}).length;}
function inRel(m,k1,k2){return !!m[k1]&&m[k1].indexOf(k2)!==-1;}
/* Blacklist: was ist je nach Stärke verboten? */
export function blackVerletzt(adj,stufe,k1,k2){
  if(inRel(adj.bench,k1,k2))return true;
  if(stufe==="schwach")return false;
  if(inRel(adj.front,k1,k2))return true;
  if(stufe==="moderat")return false;
  return inRel(adj.sideGap,k1,k2)||inRel(adj.diag,k1,k2);
}
/* Whitelist: was zählt je nach Stärke als „zusammen“? */
export function whiteVerbunden(adj,stufe,k1,k2){
  if(inRel(adj.bench,k1,k2))return true;
  if(stufe==="stark")return false;
  if(inRel(adj.sideGap,k1,k2))return true;
  if(stufe==="moderat")return false;
  return inRel(adj.front,k1,k2)||inRel(adj.diag,k1,k2);
}
export var STUFEN={stark:"stark",moderat:"moderat",schwach:"schwach"};
export function stufeVon(g){return STUFEN[g.level]||"moderat";}
export function sName(id){return S.STU[id]?(S.ANZEIGE[id]||S.STU[id].name):"?";}
export function tagById(id){for(var i=0;i<S.state.tags.length;i++)if(S.state.tags[i].id===id)return S.state.tags[i];return null;}
export function inAnyGroup(id){
  return S.state.blacklist.concat(S.state.whitelist).some(function(g){return g.members.indexOf(id)!==-1;});
}
