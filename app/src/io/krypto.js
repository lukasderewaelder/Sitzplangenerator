import { SCHEMA } from "../core/konstanten.js";
import { ganzzahl } from "../core/schema.js";

export function kryptoMoeglich(){return !!(window.crypto&&window.crypto.subtle&&window.isSecureContext&&window.TextEncoder);}
function b64(buf){
  var b=new Uint8Array(buf),s="",i;
  for(i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));
  return btoa(s);
}
function unb64(str){var s=atob(str),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
var KDF_RUNDEN=600000;
function schluessel(pw,salt,runden){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]).then(function(k){
    return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:runden,hash:"SHA-256"},k,
      {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  });
}
export function verschluesseln(text,pw){
  var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  return schluessel(pw,salt,KDF_RUNDEN).then(function(k){
    return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,new TextEncoder().encode(text));
  }).then(function(ct){
    return JSON.stringify({format:"sitzplan-sicherung",v:SCHEMA,verschluesselt:true,
      verfahren:"AES-GCM-256, Schlüssel per PBKDF2-SHA-256",
      kdf:{runden:KDF_RUNDEN,salt:b64(salt)},iv:b64(iv),daten:b64(ct),gespeichertAm:new Date().toISOString(),
      hinweis:"Verschlüsselte Sicherung des Sitzplan-Generators. Öffnen nur mit dem Passwort."},null,1);
  });
}
export function entschluesseln(paket,pw){
  var runden=ganzzahl(paket.kdf&&paket.kdf.runden,1000,5000000,KDF_RUNDEN);
  return schluessel(pw,unb64(paket.kdf.salt),runden).then(function(k){
    return crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(paket.iv)},k,unb64(paket.daten));
  }).then(function(pt){return new TextDecoder().decode(pt);});
}
