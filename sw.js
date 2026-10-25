/* Service Worker des Sitzplan-Generators (wird beim Build mit einer Versionskennung versehen).
   Strategie: Die Seite selbst kommt – wenn das Netz da ist – immer frisch vom Server und wird nebenbei
   zwischengespeichert; ohne Netz (oder bei sehr langsamem Netz) startet die zuletzt gespeicherte Fassung.
   Dadurch läuft die App im Klassenraum auch ohne WLAN, und es gibt nie eine veraltete Mischung aus
   alter Seite und neuen Dateien. Alle Pläne liegen im Browserspeicher, nicht hier. */
const VERSION = "4.0.0-576f96278a";
const CACHE = "sitzplan-" + VERSION;
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];
const WARTEZEIT_MS = 3500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith("sitzplan-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function ausDemNetz(anfrage) {
  return fetch(anfrage).then((antwort) => {
    if (antwort && antwort.ok) {
      const kopie = antwort.clone();
      caches.open(CACHE).then((c) => c.put(anfrage, kopie));
    }
    return antwort;
  });
}

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;

  if (anfrage.mode === "navigate") {
    e.respondWith(
      new Promise((fertig) => {
        let beantwortet = false;
        const nimmZwischenspeicher = () =>
          caches.match("./index.html").then((treffer) => {
            if (!beantwortet && treffer) {
              beantwortet = true;
              fertig(treffer);
            }
          });
        const timer = setTimeout(nimmZwischenspeicher, WARTEZEIT_MS);
        ausDemNetz(anfrage).then(
          (antwort) => {
            clearTimeout(timer);
            if (!beantwortet) {
              beantwortet = true;
              fertig(antwort);
            }
          },
          () => {
            clearTimeout(timer);
            nimmZwischenspeicher().then(() => {
              if (!beantwortet) fertig(Response.error());
            });
          }
        );
      })
    );
    return;
  }

  e.respondWith(caches.match(anfrage).then((treffer) => treffer || ausDemNetz(anfrage)));
});
