import { uid } from "./basis.js";
import { SCHEMA, hasOwn } from "./konstanten.js";
import { vorlageA } from "./vorlagen.js";
import { namenBilden } from "../io/listen-import.js";
import { S } from "../store.js";

/* ===================== Zustand ===================== */
export function defaultState(){
  var s={
    v:SCHEMA, planName:"Sitzplan",
    room:{cols:10, rows:12, furniture:[]},
    tables:[], seatMeta:{}, students:[], tags:[],
    blacklist:[], whitelist:[], arrangement:{},
    options:{gender:"off", level:"off", solo:"off",
             showNotes:false, showGender:false, showLevel:false, nameFormat:"voll"},
    roomTemplates:{B:null,C:null},
    security:{hash:null,autolock:{min:10,bg:true}}
  };
  /* Startraum ist Vorlage A (Standard-Klassenzimmer) */
  var a=vorlageA();
  s.room.cols=a.cols;s.room.rows=a.rows;s.tables=a.tables;s.room.furniture=a.furniture;
  return s;
}
S.state=defaultState();
S.view="teacher";
S.selected=null;
S.unlocked=false;
S.STU={};                                   // id -> Schüler:in (Index für Tempo)
S.ANZEIGE={};                               // id -> Name, wie er im Plan erscheint
export var NAMENSFORMATE={voll:"Vorname Nachname",vorname:"Vorname (bei Gleichheit mit Initiale)",vornameN:"Vorname und Initiale",nachVor:"Nachname, Vorname"};
/* „Anna Maria Schmidt“ → Vorname „Anna Maria“, Nachname „Schmidt“; „Schmidt, Anna“ ebenso */
export function nameTeilen(n){
  n=String(n||"").replace(/\s+/g," ").trim();
  var k=n.indexOf(",");
  if(k>0)return{vor:n.slice(k+1).trim(),nach:n.slice(0,k).trim()};
  var t=n.split(" ");
  if(t.length>1){var nach=t.pop();return{vor:t.join(" "),nach:nach};}
  return{vor:n,nach:""};
}
export function vollName(vor,nach){return(String(vor||"")+" "+String(nach||"")).replace(/\s+/g," ").trim();}
export function namensSchluessel(vor,nach){return vollName(vor,nach).toLowerCase();}
export function personSchluessel(s){return namensSchluessel(s.vorname,s.nachname);}
export function neuePerson(vor,nach,w){
  w=w||{};
  return{id:uid("s"),vorname:vor||"",nachname:nach||"",name:vollName(vor,nach),gender:w.gender||"x",
    level:w.level||2,requiredTags:[],note:w.note||"",solo:false,lehrer:false};
}
/* Gruppen gleicher Namen (Groß-/Kleinschreibung egal) */
export function doppelteNamen(liste){
  var g={},out=[];
  liste.forEach(function(s){var k=personSchluessel(s);if(!k)return;(g[k]=g[k]||[]).push(s);});
  Object.keys(g).forEach(function(k){if(g[k].length>1)out.push(g[k]);});
  return out;
}
export function reindex(){
  S.STU={};S.ANZEIGE={};
  S.state.students.forEach(function(s){
    if(typeof s.vorname!=="string"&&typeof s.nachname!=="string"){var tl=nameTeilen(s.name);s.vorname=tl.vor;s.nachname=tl.nach;}
    if(typeof s.vorname!=="string")s.vorname="";
    if(typeof s.nachname!=="string")s.nachname="";
    var v=vollName(s.vorname,s.nachname);
    if(v&&s.name!==v)s.name=v;
    S.STU[s.id]=s;
  });
  var fmt=(S.state.options&&hasOwn(NAMENSFORMATE,S.state.options.nameFormat))?S.state.options.nameFormat:"voll";
  var namen=namenBilden(S.state.students.map(function(s){return{vor:s.vorname,nach:s.nachname,voll:s.name};}),fmt);
  S.state.students.forEach(function(s,i){S.ANZEIGE[s.id]=namen[i]||s.name;});
}
