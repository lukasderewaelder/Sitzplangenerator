import { el, esc } from "../core/basis.js";
import { S } from "../store.js";
import { showTab } from "./bereiche.js";
import { ic } from "./symbole.js";

S.hilfeVon="plan";
export function renderHelpTab(){
  var k=function(n,t){return '<span class="kbd">'+(n?ic(n):"")+(t||"")+"</span>";};
  el("helpPane").innerHTML=`<div class="help hlayout">
<aside class="hside" aria-label="Inhalt der Anleitung"><div class="hside-in">
  <div class="hside-head"><h2>Anleitung</h2><button type="button" class="btn sm" id="helpBack">${ic("chevL")}Zurück</button></div>
  <p class="hside-sub">Alles zum Sitzplan-Generator – in der Reihenfolge, in der du typischerweise vorgehst.<br>Version ${__APP_VERSION__}</p>
  <div class="search hsearch">${ic("search")}<input type="search" id="helpSuche" placeholder="Anleitung durchsuchen" aria-label="Anleitung durchsuchen" aria-controls="hMain" autocomplete="off"></div>
  <p class="hfund" id="helpFund" aria-live="polite"></p>
  <nav class="toc" aria-label="Inhalt">
    <div class="tocgrp">Erste Schritte</div>
    <a href="#h1"><span class="nr">1</span>Schnellstart</a><a href="#h2"><span class="nr">2</span>Die Oberfläche</a>
    <div class="tocgrp">Einrichten</div>
    <a href="#h3"><span class="nr">3</span>Raum</a><a href="#h4"><span class="nr">4</span>Klasse</a><a href="#h5"><span class="nr">5</span>Regeln</a>
    <a href="#h6"><span class="nr">6</span>Platzmerkmale</a><a href="#h7"><span class="nr">7</span>Einstellungen</a>
    <div class="tocgrp">Mit dem Plan arbeiten</div>
    <a href="#h8"><span class="nr">8</span>Neu anordnen</a><a href="#h9"><span class="nr">9</span>Von Hand umsetzen</a>
    <a href="#h10"><span class="nr">10</span>Ansichten &amp; Beamer</a><a href="#h11"><span class="nr">11</span>Drucken</a>
    <div class="tocgrp">Sichern und Hilfe</div>
    <a href="#h12"><span class="nr">12</span>Speichern &amp; Sicherung</a><a href="#h13"><span class="nr">13</span>Passwort</a>
    <a href="#h14"><span class="nr">14</span>Wenn es klemmt</a><a href="#h15"><span class="nr">15</span>Tastatur</a>
  </nav>
</div></aside>
<div class="hmain" id="hMain">

<div class="card" id="h1">
<h3>1. Schnellstart in fünf Minuten</h3>
<ol>
  <li>Der Raum startet als <strong>A · Standard-Klassenzimmer</strong> (3 Doppelbänke je Reihe, 5 Reihen). Passt er nicht, unter <strong>Raum</strong> → „Vorlagen“ B oder C ${k("","Anwenden")}, mit den Pfeilen am Rand vergrößern oder verkleinern – oder mit ${k("grid","Schnell-Layout …")} eigene Reihen anlegen.</li>
  <li><strong>Klasse</strong> öffnen und alle Namen in das Feld „Mehrere auf einmal“ einfügen (durch Komma getrennt, Nachname jeweils zuletzt, oder direkt aus Excel kopiert), dann ${k("","Übernehmen")}. Eine CSV- oder Excel-Datei geht auch.</li>
  <li>Oben rechts auf ${k("shuffle","Neu anordnen")} tippen.</li>
  <li>Einzelne Namen an die gewünschte Stelle ziehen – oder Platz antippen, dann Zielplatz antippen.</li>
  <li>${k("print","Drucken")} in der unteren Leiste – Lehrer- und Schülersicht auf je einer Seite oder nur eine davon.</li>
</ol>
<p>Regeln, Platzmerkmale und Mischoptionen brauchst du erst, wenn der Zufall allein nicht reicht. Vertippt? ${k("undo")} oben macht den letzten Schritt rückgängig (auch mit <span class="kbd">Strg</span>+<span class="kbd">Z</span>). Gespeichert wird automatisch.</p>
</div>

<div class="card" id="h2">
<h3>2. Die Oberfläche</h3>
<p>Der Sitzplan ist die Arbeitsfläche – alles andere tritt zurück.</p>
<table>
  <tr><th>Bereich</th><th>Was dort ist</th></tr>
  <tr><td><strong>Kopfzeile</strong></td><td>Planname (antippen zum Umbenennen), die drei Bereiche <strong>Sitzplan · Raum · Klasse</strong>, ${k("undo")} ${k("redo")} Rückgängig und Wiederholen, der Speicherstatus, ${k("help")} diese Anleitung, ${k("more")} weitere Funktionen und die Hauptaktion ${k("shuffle","Neu anordnen")}.</td></tr>
  <tr><td><strong>Statusleiste links</strong></td><td>Wie viele platziert sind, das Ergebnis der Prüfung und klickbare Kennzahlen (Schüler:innen, Plätze, fixiert, Regeln, Konflikte). Darunter „Nicht platziert“, die Anzeige-Schalter und die Legende. Auf Tablets öffnest du sie über ${k("panel","Status")} in der unteren Leiste.</td></tr>
  <tr><td><strong>Arbeitsfläche</strong></td><td>Der Plan, immer passend ins Fenster eingepasst. Zoomen mit − / + unten, mit zwei Fingern oder mit Strg + Mausrad.</td></tr>
  <tr><td><strong>Auswahl rechts</strong></td><td>Details zum angetippten Platz: Person, Tisch und Platz, Platzmerkmale, Regeln, dazu Knöpfe zum Fixieren, Vom-Platz-Nehmen und Öffnen in der Klassenliste. Ohne Auswahl stehen hier die offenen Regeln. Auf dem Tablet im Hochformat erscheint dieser Bereich als Blatt von unten.</td></tr>
  <tr><td><strong>Untere Leiste</strong></td><td>Lehrer- oder Schülersicht, Zoom, ${k("beamer","Beamer")} und ${k("print","Drucken")}.</td></tr>
  <tr><td><strong>Menü ${k("more")}</strong></td><td>Drucken, Beamer-Modus, Sicherung herunterladen und öffnen, Klasse sperren, Darstellung (hell, dunkel, automatisch), Anleitung und „Neuen leeren Plan beginnen“.</td></tr>
</table>
</div>

<div class="card" id="h3">
<h3>3. Raum einrichten</h3>
<p>Der Bereich <strong>Raum</strong> bildet dein Klassenzimmer als Raster ab. Oben ist immer die Vorderseite. Oben liegt die Werkzeugleiste, rechts stehen die Eigenschaften dessen, was du antippst.</p>
<h4>Tische und Möbel</h4>
<ul>
  <li>${k("plus","Einzel")} ${k("plus","2er")} ${k("plus","3er")} ${k("plus","4er")} legen einen Einzeltisch oder eine Bank an, ${k("board","Tafel")} und ${k("desk","Lehrertisch")} weitere Möbel.</li>
  <li>Verschieben: Tisch <strong>am Rand</strong> greifen und ziehen. Liegt das Ziel außerhalb oder auf etwas anderem, rastet er nicht ein.</li>
  <li>Stellst du Tische <strong>direkt aneinander</strong> – nebeneinander oder vor- und hintereinander –, verschmelzen sie im Sitzplan und im Ausdruck zu einer gemeinsamen Tischfläche.</li>
  <li>Ein Tipp auf eine <strong>leere Stelle</strong> hebt die Auswahl von Tisch, Möbelstück oder Platz wieder auf.</li>
  <li>Angetippt zeigt rechts ${k("rotate","Um 90° drehen")}, ${k("trash","Löschen")} und die <strong>Drehung</strong>; bei Tafel und Lehrertisch lassen sich Beschriftung (etwa „Smartboard“) und Breite ändern.</li>
  <li>Hinweis: Wird der Lehrertisch entfernt oder verschoben, meldet sich das Programm, sobald jemand „nah am Lehrertisch“ sitzen soll.</li>
  <li>${k("grid","Schnell-Layout …")} öffnet einen Dialog mit Vorschau: Tischgröße, Tische pro Reihe, Reihen. Er ersetzt die vorhandenen Tische; Tafel und Lehrertisch bleiben.</li>
</ul>
<h4>Tische schräg stellen</h4>
<p>Tische lassen sich in <strong>5°-Schritten</strong> drehen – etwa für eine U-Form oder schräg gestellte Reihen:</p>
<ul>
  <li><span class="kbd">Umschalt</span> + <strong>Mausrad</strong> über einem Tisch dreht ihn (<span class="kbd">Alt</span> + Mausrad geht auch).</li>
  <li><span class="kbd">Q</span> und <span class="kbd">E</span> drehen den ausgewählten Tisch um 5° gegen bzw. im Uhrzeigersinn, <span class="kbd">R</span> um 90°.</li>
  <li>Rechts unter „Drehung“: ${k("rotL")} ${k("rotate")} oder den Winkel direkt eintippen; „gerade stellen“ setzt ihn auf 0°.</li>
  <li>Bei <strong>90°, 180° und 270°</strong> rastet der Tisch wieder genau im Raster ein: Er steht dann längs bzw. quer, verbindet sich mit angrenzenden Tischen, und die Plätze wandern mit – bei 180° sitzt, wer vorher links saß, rechts.</li>
</ul>
<p>Ist zum Drehen zu wenig Platz, bleibt der Tisch stehen und das Programm sagt Bescheid. Schnell hintereinander gedreht zählt als ein Schritt für ${k("undo")}. Im Sitzplan und im Ausdruck dreht sich der Tisch mit – der <strong>Text steht aber immer waagrecht</strong> im Platz. Nachbarschaften (für Regeln und „allein sitzen“) werden bei gedrehten Tischen nach dem tatsächlichen Abstand der Plätze bestimmt.</p>
<h4>Plätze: Merkmale und Sperren</h4>
<p>Ein Tipp <strong>auf einen Platz</strong> (die nummerierten Felder im Tisch) zeigt ihn rechts: Platzmerkmale an- und abwählen, ein neues Merkmal mit Farbe anlegen oder den Platz sperren. Gesperrte Plätze werden beim Anordnen übersprungen und bleiben im Ausdruck leer.</p>
<p>Für viele Plätze auf einmal: ${k("select","Mehrfachauswahl")} – dann wählt jeder Tipp einen Platz aus oder ab, und rechts wirken Merkmale, „Alle sperren“ und „Alle freigeben“ auf die ganze Auswahl.</p>
<h4>Raum vergrößern und verkleinern</h4>
<p>Links, rechts und hinten am Raster sitzen runde Pfeil-Knöpfe: Der hervorgehobene Pfeil nach außen fügt eine Spalte bzw. Reihe an, der Pfeil nach innen nimmt eine weg. Links anfügen schiebt alle Tische mit. Wegnehmen geht nur, wenn am Rand nichts steht. Vorn an der Tafel ist das nicht nötig. Alternativ lässt sich die Rastergröße rechts als Zahl eingeben. Der Zoom unten ändert nur die Anzeige, nicht das Raster.</p>
<h4>Vorlagen</h4>
<p>Ist nichts ausgewählt, stehen rechts die Vorlagen als kleine Vorschaubilder:</p>
<ul>
  <li><strong>A · Standard-Klassenzimmer</strong> – drei Doppelbänke je Reihe, fünf Reihen (30 Plätze)</li>
  <li><strong>B · Klassenzimmer quer</strong> – 2er, 4er und 2er je Reihe, drei Reihen (24 Plätze)</li>
  <li><strong>C · NaWi-Raum</strong> – sieben Plätze je Reihe, vier Reihen (28 Plätze)</li>
</ul>
<p>Darunter gibt es zwei <strong>eigene Vorlagen</strong>, die du mit ${k("","Speichern")} belegst. Gespeichert werden Tische, Möbel und Rastergröße, nicht die Klassenliste. Eine Vorlage anzuwenden ersetzt die Tische; die Namen bleiben.</p>
</div>

<div class="card" id="h4">
<h3>4. Klasse pflegen</h3>
<p>Der Bereich <strong>Klasse</strong> hat vier Reiter: <strong>Schüler:innen · Regeln · Platzmerkmale · Einstellungen</strong>.</p>
<h4>Namen erfassen</h4>
<ul>
  <li>Einzeln: <strong>Vorname</strong> und <strong>Nachname</strong> eintragen, Geschlecht und Leistungsstärke wählen, ${k("plus","Hinzufügen")} (oder Eingabetaste). Der Nachname ist freiwillig.</li>
  <li>Mehrere auf einmal: Liste in das Feld einfügen, getrennt durch Komma, Semikolon oder Zeilenumbruch. Das letzte Wort jedes Namens wird als Nachname übernommen.</li>
  <li><strong>Aus Excel kopieren:</strong> Eine Spalte mit Namen – oder „Nachname“ und „Vorname“ – markieren und einfügen. Es erscheint eine Vorschau.</li>
  <li><strong>Aus einer Datei:</strong> ${k("sheet","Aus Datei (CSV, Excel) …")} liest CSV und Excel (.xlsx). In der Vorschau wählst du, wie die Namen im Plan erscheinen, und ob die Liste <strong>ergänzt</strong> oder <strong>ersetzt</strong> wird. Spalten wie „Geschlecht“, „Leistung“ oder „Hinweis“ werden mit übernommen.</li>
</ul>
<h4>Gleiche Namen</h4>
<p>Jede Person braucht einen <strong>eindeutigen Namen</strong>. Kommt ein Name doppelt vor – in der Liste selbst oder weil es ihn in der Klasse schon gibt –, erscheint eine Meldung: Ergänze beim betroffenen Eintrag den Nachnamen oder einen Anfangsbuchstaben. Steht jemand schon in der Klasse, lässt du den Eintrag mit „weglassen“ einfach aus. Erst wenn alles eindeutig ist, lässt sich die Liste übernehmen. Auch beim Einzeln-Hinzufügen und beim Umbenennen wird ein doppelter Name abgelehnt.</p>
<h4>Die Klassenliste</h4>
<p>Jede Person steht in einer Zeile: Vorname, Nachname, Geschlecht, Leistung, Besonderes (allein, Lehrertisch, Hinweis, Platzwunsch) und die Zahl ihrer Regeln. Namen lassen sich direkt in der Zeile ändern. Der Pfeil ${k("chevR")} klappt die Details auf: Hinweis, „sitzt allein“, „nah am Lehrertisch“ und Platzwünsche.</p>
<p><strong>Suchen, filtern und sortieren:</strong> ${k("search","Namen suchen")}, daneben die Filter „Alle Geschlechter“ und „Alle Leistungsstände“. Sortiert wird nach Eingabe-Reihenfolge, Vorname, Nachname, Geschlecht oder Leistung – über die Auswahl „Sortieren“ oder per Tipp auf die Spaltenüberschrift; ein zweiter Tipp (oder der Knopf daneben, etwa „A–Z“) kehrt die Reihenfolge um. „Filter aufheben“ zeigt wieder alle.</p>
<p><strong>Sammeländerungen:</strong> Setze vorne Häkchen bei mehreren Personen. Dann erscheint eine Leiste, mit der du für alle zugleich Leistung, Geschlecht, Platzwunsch, Einzelplatz oder „nah am Lehrertisch“ setzt – oder sie entfernst.</p>
<h4>Geschlecht, Leistung und Hinweise</h4>
<p>Alles freiwillig. Ob eine Angabe beim Anordnen <strong>berücksichtigt</strong> wird, legst du unter „Einstellungen → Mischen“ fest. Ob sie im Plan und im Ausdruck <strong>zu sehen</strong> ist, unter „Im Plan und im Ausdruck anzeigen“ – oder direkt mit den Schaltern links in der Statusleiste. Sichtbar wird sie nur in der Lehrersicht, nie auf dem Blatt für die Klasse.</p>
</div>

<div class="card" id="h5">
<h3>5. Regeln: Auseinander setzen und Zusammen setzen</h3>
<p>Beide arbeiten mit <strong>Gruppen</strong> beliebiger Größe. Jede Gruppe hat ihre eigene Stufe – du kannst strenge und lockere Gruppen nebeneinander führen.</p>
<h4>${ic("split")} Auseinander setzen – wie groß ist der Abstand?</h4>
<table>
  <tr><th>Abstand</th><th>nicht erlaubt ist</th></tr>
  <tr><td><strong>groß</strong></td><td>jeder Kontakt im Umfeld: nebeneinander (auch über den Gang), vor- oder hintereinander, schräg</td></tr>
  <tr><td><strong>mittel</strong></td><td>direkt nebeneinander und direkt vor- oder hintereinander; über den Gang oder schräg ist erlaubt</td></tr>
  <tr><td><strong>klein</strong></td><td>nur direkt nebeneinander auf derselben Bank</td></tr>
</table>
<h4>${ic("link")} Zusammen setzen – wie nah?</h4>
<table>
  <tr><th>Nähe</th><th>gilt als „zusammen“</th></tr>
  <tr><td><strong>gleiche Bank</strong></td><td>direkt nebeneinander am selben Tisch</td></tr>
  <tr><td><strong>nebeneinander</strong></td><td>direkt nebeneinander, auch über den Gang hinweg</td></tr>
  <tr><td><strong>in der Nähe</strong></td><td>zusätzlich schräg oder vor- bzw. hintereinander</td></tr>
</table>
<p>${k("plus","Neue Gruppe")} legt eine Gruppe an; mit „Personen auswählen“ tippst du die Namen an. Ein × am Namen entfernt ihn wieder. Eine Gruppe wirkt erst ab zwei Personen. Frühere Pläne mit „Blacklist“ und „Whitelist“ werden unverändert übernommen – die Begriffe heißen jetzt nur verständlicher.</p>
<h4>Nachbarschaft im Detail</h4>
<ul>
  <li><strong>Nebeneinander (gleiche Bank):</strong> zwei Plätze am selben Tisch, die direkt aneinandergrenzen – oder zwei Tische, die sich ohne Lücke berühren. An einem Vierertisch sind Platz 1 und 4 keine Nachbarn.</li>
  <li><strong>Über den Gang:</strong> gleiche Reihe, zwei bis drei Rasterfelder Abstand.</li>
  <li><strong>Vor- und hintereinander:</strong> dieselbe Spalte, höchstens zwei Rasterfelder Abstand.</li>
  <li><strong>Schräg:</strong> ein bis zwei Felder versetzt in beide Richtungen.</li>
  <li>Über einen gesperrten Platz hinweg entsteht keine Nachbarschaft.</li>
  <li>Bei <strong>gedrehten Tischen</strong> zählt der tatsächliche Abstand der Plätze, gemessen entlang der Tische.</li>
</ul>
<h4>${ic("desk")} Nah am Lehrertisch</h4>
<p>Wie „sitzt allein“ ist das eine Eigenschaft einer Person (in den Details der Klassenliste oder als Sammeländerung). Es gibt zwei Stufen:</p>
<table>
  <tr><th>Stufe</th><th>Umkreis</th><th>gedacht für</th></tr>
  <tr><td><strong>Standard</strong></td><td>höchstens 4 Felder vom Lehrertisch</td><td>wer wirklich nah sitzen soll</td></tr>
  <tr><td><strong>weich</strong></td><td>höchstens 6 Felder vom Lehrertisch</td><td>wer eher in der Nähe sitzen soll</td></tr>
</table>
<p>In beiden Stufen gilt: je näher, desto besser. Wer „Standard“ hat, bekommt bei Knappheit die näheren Plätze. Gemessen wird der tatsächliche Abstand von der Platzmitte zum Lehrertisch in Feldern – in jede Richtung, auch über Gänge, bei gedrehten Tischen und bei mehreren Lehrertischen (dann zählt der nächste). Der Platz direkt neben dem Lehrertisch hat den Abstand ½ Feld, der vierte Platz in derselben Richtung 3½.</p>
<ul>
  <li>Die Regel gilt nur, wenn im Raum ein <strong>Lehrertisch</strong> steht. Fehlt er, ruht sie – die Prüfung zeigt das an.</li>
  <li>Wird der Lehrertisch <strong>entfernt</strong>, fragt das Programm nach und weist darauf hin, dass die Regel entfällt.</li>
  <li>Wird er <strong>verschoben</strong> oder verbreitert, nennt ein Hinweis, wer jetzt zu weit weg sitzt. Dann neu anordnen oder im Sitzplan „Beheben“ nutzen.</li>
</ul>
</div>

<div class="card" id="h6">
<h3>6. Platzmerkmale und Platzwünsche</h3>
<p>Ein <strong>Platzmerkmal</strong> beschreibt einen Platz: „vorne“, „Fenster“, „Steckdose“, „Nähe Tür“. Im Raum weist du es Plätzen zu, in der Klassenliste setzt du es als <strong>Platzwunsch</strong> für eine Person. Das Programm behandelt Wünsche als sehr starke, aber nicht absolute Vorgabe und sagt dir, wenn einer nicht erfüllbar war.</p>
<p>Im Reiter „Platzmerkmale“ siehst du alle Merkmale mit Anzahl der Plätze und Wünsche, kannst sie umbenennen, umfärben oder löschen. Unter jedem Merkmal steht, <strong>wer so einen Platz braucht</strong>: Tippe ins Feld „Name eintippen …“ – schon beim ersten Buchstaben erscheint eine Liste passender Personen. Mit <span class="kbd">↓</span> und <span class="kbd">Eingabe</span> oder per Tipp übernehmen; das Feld bleibt offen für den nächsten Namen. Ein × am Namen entfernt den Wunsch wieder. Gibt es mehr Wünsche als markierte Plätze, steht dort „zu wenig Plätze“.</p>
<div class="ok">Platzmerkmale sind reine Planungshilfe und werden <strong>nie</strong> gedruckt.</div>
</div>

<div class="card" id="h7">
<h3>7. Einstellungen</h3>
<h4>Mischen</h4>
<p>Weiche Regeln, die hinter „Auseinander setzen“, „Zusammen setzen“ und Platzwünschen zurücktreten. <strong>Geschlecht:</strong> gemischt oder getrennt. <strong>Leistung:</strong> gemischt (stark neben schwächer) oder ähnlich (gleiches Niveau zusammen). Ganz aufgehen wird eine Mischregel selten – das ist kein Fehler.</p>
<h4>Einzelsitzen</h4>
<p><strong>nur markierte Personen</strong> – wer in der Liste „sitzt allein“ hat, bekommt keinen direkten Nachbarn am Tisch. <strong>alle einzeln</strong> – jede Person sitzt allein, soweit die Plätze reichen (etwa für Klassenarbeiten); „Zusammen setzen“ gilt dann nicht. Reicht der Raum nicht, nennt die Prüfung die exakt höchstmögliche Zahl.</p>
<h4>Im Plan und im Ausdruck anzeigen</h4>
<p>Hinweise, Geschlecht und Leistungsstärke – jeweils einzeln. Standardmäßig ist alles aus; ein frisch gedruckter Plan enthält nur Namen.</p>
<p><strong>Namen im Plan und im Ausdruck:</strong> „Vorname Nachname“, „Vorname“ (bei gleichen Vornamen automatisch mit Anfangsbuchstaben des Nachnamens), „Vorname und Initiale“ oder „Nachname, Vorname“. Die Klassenliste zeigt immer beide Teile.</p>
</div>

<div class="card" id="h8">
<h3>8. Neu anordnen</h3>
<p>${k("shuffle","Neu anordnen")} verteilt alle Schüler:innen neu – aus jedem Bereich heraus, auch im Beamer-Modus. Im Hintergrund entstehen viele Zufallsvarianten, die bewertet und durch Platztausch verbessert werden. Vorrang haben: alle unterbringen, Platzwünsche, Auseinander setzen, Einzelplätze, nah am Lehrertisch, Zusammen setzen, zuletzt das Mischen.</p>
<h4>Vorprüfung</h4>
<p>Links steht immer, ob alles passt – etwa „Bereit zum Anordnen“ oder „2 Hinweise vor dem Anordnen“. Ein Tipp darauf öffnet die <strong>Prüfung</strong>: Sie zeigt schon vorher, was nicht aufgehen kann (zu wenige Plätze oder Merkmal-Plätze, eine Gruppe, die an keinen Tisch passt oder sich im Raum nicht trennen lässt, widersprüchliche Regeln) und darunter, welche Regeln im aktuellen Plan offen sind.</p>
<h4>Konflikte direkt lösen</h4>
<p>Jede Konflikt-Zeile hat einen Knopf ${k("","Beheben")}. Er setzt <strong>nur die Betroffenen</strong> um – mit einem einzigen Platztausch oder, wenn das nicht reicht, mit einem Ringtausch über drei Plätze. Der übrige Plan bleibt, wie er ist, und es entsteht dabei kein neuer Konflikt. Wer umgesetzt wurde, leuchtet kurz auf; mit ${k("undo")} nimmst du es zurück. Fixierte Plätze bleiben unangetastet. Lässt sich ein Konflikt so nicht lösen, sagt das Programm Bescheid.</p>
<p>Daneben führen „Regel ändern“ zur Gruppe, „Person bearbeiten“ zur Zeile in der Klassenliste und „Plätze markieren“ in den Raum. Nur wenn nach dem Anordnen etwas offen bleibt, öffnet sich ein Fenster; die offenen Regeln stehen außerdem rechts im Auswahl-Bereich.</p>
<h4>Fixierte Plätze</h4>
<p>Fixierte Plätze (${k("pin")}) bleiben beim nächsten Anordnen, wo sie sind, und lassen sich nicht versehentlich tauschen – fixieren über das Nadel-Symbol im Platz, rechts in der Auswahl oder mit der Taste F.</p>
</div>

<div class="card" id="h9">
<h3>9. Von Hand umsetzen</h3>
<ul>
  <li><strong>Ziehen:</strong> Namen auf einen anderen Platz ziehen – die beiden tauschen. Auf einen freien Platz ziehen – die Person zieht um. Nach „Nicht platziert“ ziehen – sie verlässt ihren Platz.</li>
  <li><strong>Antippen:</strong> Platz antippen (er wird markiert, rechts erscheinen die Details), dann den Zielplatz antippen. Aus „Nicht platziert“ geht das genauso.</li>
  <li><strong>Mit der Tastatur:</strong> Pfeiltasten wandern, Eingabe wählt aus und tauscht, F fixiert, Entf nimmt vom Platz, Esc hebt die Auswahl auf.</li>
</ul>
<p>Jede Umsetzung lässt sich mit ${k("undo")} zurücknehmen.</p>
</div>

<div class="card" id="h10">
<h3>10. Ansichten, Zoom und Beamer</h3>
<table>
  <tr><th>Sicht</th><th>Blickrichtung</th><th>zeigt zusätzlich</th></tr>
  <tr><td><strong>Lehrersicht</strong></td><td>von der Tafel in die Klasse – links und rechts wie für dich</td><td>Hinweise, Geschlecht, Leistung – sofern eingeschaltet</td></tr>
  <tr><td><strong>Schülersicht</strong></td><td>von hinten nach vorn zur Tafel</td><td>nur Namen</td></tr>
</table>
<p>Der Plan passt sich automatisch ins Fenster ein (100 %). Mit − und + zoomst du, ein Tipp auf die Prozentzahl setzt zurück.</p>
<h4>Beamer-Modus</h4>
<p>${k("beamer","Beamer")} zeigt nur noch den Sitzplan in Schülersicht – groß, ohne Leisten, Markierungen, Merkmale oder sensible Angaben. Bearbeiten ist gesperrt, der Bereich „Klasse“ wird gesperrt. Wo der Browser es erlaubt, wird auf Vollbild geschaltet. ${k("shuffle","Neu anordnen")} bleibt oben sichtbar – so lässt sich vor der Klasse neu mischen. Dabei erscheint kein Bericht mit Namen oder Regeln, höchstens der neutrale Hinweis, dass nicht alle Regeln aufgingen; die Details stehen nach dem Beenden in der Prüfung. ${k("exit","Beamer beenden")} fragt nach dem Passwort, falls eines gesetzt ist. Der Modus bleibt auch nach dem Neuladen aktiv.</p>
</div>

<div class="card" id="h11">
<h3>11. Drucken und als PDF sichern</h3>
<p>${k("print","Drucken")} öffnet eine Auswahl: <strong>Lehrer- und Schülersicht</strong> (zwei Seiten), <strong>nur Lehrersicht</strong> oder <strong>nur Schülersicht</strong>. Die Wahl wird gemerkt, und der Dialog warnt, wenn die Lehrersicht Hinweise, Geschlecht oder Leistung enthält. Jede Sicht passt auf ein Blatt A4, meist im Querformat. Ein PDF entsteht im Druckfenster über „Als PDF speichern“.</p>
<ul>
  <li>Jeder Platz ist ein <strong>Quadrat</strong> – so sieht der Plan in jeder Raumform und Tischanordnung sauber aus. Direkt aneinandergestellte Tische bilden eine gemeinsame Fläche, gesperrte Plätze bleiben leer, Kopfzeile mit Planname, Sicht und Datum.</li>
  <li>Gedrehte Tische werden gedreht gedruckt, der Text steht aber immer waagrecht in der Mitte des Platzes.</li>
  <li>Die Namen stehen immer größer als Hinweise und Zusatzangaben; die Gänge werden im Ausdruck schmaler gezeichnet, damit die Plätze groß werden.</li>
  <li>Platzmerkmale nie; Hinweise, Geschlecht und Leistung nur, wenn eingeschaltet, und nur in der Lehrersicht.</li>
  <li>Schrift: <strong>Century Gothic</strong>. Ist sie auf dem Gerät nicht installiert (etwa auf iPad oder Chromebook), druckt das Programm mit einer eingebauten, fast gleich aussehenden Schrift – der Plan sieht also überall gleich aus.</li>
</ul>
<div class="note">Zum Aushängen „nur Schülersicht“ wählen.</div>
</div>

<div class="card" id="h12">
<h3>12. Speichern, Rückgängig und Sicherung</h3>
<p>Jede Änderung wird nach einem kurzen Moment <strong>automatisch in diesem Browser</strong> gespeichert. Oben steht der Stand: ${k("check","Gespeichert")}, „Speichert …“ oder <strong>„Nicht gespeichert“</strong> – dann verweigert der Browser das Speichern (privates Fenster, voller Speicher). Ein Tipp darauf erklärt den Grund und bietet sofort eine Sicherung an. Ist der Plan in einem zweiten Fenster offen, bekommst du einen Hinweis.</p>
<p>${k("undo")} und ${k("redo")} nehmen Schritte zurück oder wiederholen sie (<span class="kbd">Strg</span>+<span class="kbd">Z</span>, <span class="kbd">Strg</span>+<span class="kbd">Umschalt</span>+<span class="kbd">Z</span>). Die letzten 60 Schritte bleiben erhalten – auch „Neuen leeren Plan beginnen“ und „Sicherung öffnen“ lassen sich zurücknehmen.</p>
<h4>Sicherung</h4>
<ul>
  <li>Menü ${k("more")} → <strong>Sicherung herunterladen</strong> speichert den ganzen Plan als Datei (mit Planname und Datum im Dateinamen) – auf Wunsch <strong>mit Passwort verschlüsselt</strong>.</li>
  <li><strong>Sicherung öffnen</strong> holt sie zurück, bei verschlüsselten mit Passwortabfrage. Die Datei wird geprüft; Sicherungen <strong>aus allen früheren Fassungen</strong> werden umgewandelt, und du siehst, was angepasst wurde. Lässt sich bei einer sehr alten Datei der Raum nicht lesen, werden wenigstens Klassenliste und Regeln übernommen.</li>
  <li>Eine Sicherung aus <em>dieser</em> Fassung lässt sich in einer älteren Fassung des Programms (etwa einer früher gespeicherten Kopie) nicht öffnen – dafür immer die neueste Datei verwenden.</li>
  <li>Für <strong>mehrere Klassen</strong> gibst du jeweils einen Plannamen ein und lädst pro Klasse eine Sicherung herunter. Der Browser merkt sich nur den zuletzt geöffneten Plan.</li>
</ul>
<div class="note">Der Browserspeicher gehört zu diesem Gerät. Lege von einem fertigen Plan eine Sicherung an – mit Hinweisen oder Leistungsstärken am besten verschlüsselt.</div>
<h4>Als App installieren (PC und iPad)</h4>
<ul>
  <li><strong>iPad (Safari):</strong> Teilen-Symbol → „Zum Home-Bildschirm“. Die App startet dann ohne Browserleiste und auch ohne WLAN.</li>
  <li><strong>PC (Chrome oder Edge):</strong> in der Adressleiste auf das Installieren-Symbol klicken (oder Menü → „App installieren“).</li>
  <li>Die installierte App hat einen <strong>eigenen Speicher</strong>, getrennt vom Browser. Pläne aus dem Browser holst du dort mit „Sicherung herunterladen“ und in der App mit „Sicherung öffnen“.</li>
  <li>Zwischen PC und iPad gelangen Pläne ebenfalls über die Sicherungsdatei (etwa über einen Cloud-Ordner wie iCloud Drive oder OneDrive).</li>
</ul>
</div>

<div class="card" id="h13">
<h3>13. Passwort und automatische Sperre</h3>
<p>Unter <strong>Klasse → Einstellungen → Passwortschutz</strong> legst du ein Passwort fest. Danach ist der Bereich „Klasse“ gesperrt – mit Namen, Hinweisen, Leistungsstärken und Regeln; ein Schloss am Reiter zeigt es an. Über das Menü sperrst du jederzeit wieder ab.</p>
<p>Mit Passwort sperrt sich der Bereich außerdem nach 5 bis 30 Minuten ohne Eingabe (voreingestellt: 10) und sofort, wenn du in ein anderes Programm wechselst. Beides lässt sich ändern.</p>
<div class="note">Das Passwort ist ein Sichtschutz auf diesem Gerät. Eine heruntergeladene Sicherung ist nur geschützt, wenn du sie verschlüsselst. Ein vergessenes Passwort lässt sich nicht zurücksetzen – dann helfen eine ältere Sicherung oder „Neuen leeren Plan beginnen“ im Menü.</div>
</div>

<div class="card" id="h14">
<h3>14. Wenn es klemmt</h3>
<table>
  <tr><th>Situation</th><th>Was hilft</th></tr>
  <tr><td>„… hat keinen Platz“</td><td>Weniger nutzbare Plätze als Personen. Tische ergänzen oder gesperrte Plätze freigeben.</td></tr>
  <tr><td>„… sitzen zu nah beieinander“</td><td>Der Abstand ist zu groß für den Raum. Eine Stufe kleiner wählen (groß → mittel → klein) hilft oft.</td></tr>
  <tr><td>„… nicht nah genug bei der eigenen Gruppe“</td><td>Gruppen kollidieren oder passen nicht an einen Tisch. Geringere Nähe wählen, kleinere Gruppen bilden oder größere Tische verwenden.</td></tr>
  <tr><td>„… hat keinen Platz mit …“</td><td>Zu wenige Plätze mit diesem Merkmal. Im Raum weitere Plätze markieren.</td></tr>
  <tr><td>„… sitzt nicht allein“</td><td>Zu wenige Tische für so viele Einzelplätze. Die Prüfung nennt die höchstmögliche Anzahl. Einzeltische helfen.</td></tr>
  <tr><td>„… nicht nah genug am Lehrertisch“</td><td>Zu viele Personen für die Plätze rund um den Lehrertisch – oder er wurde verschoben. „Beheben“, neu anordnen oder den Lehrertisch näher an die Tische stellen.</td></tr>
  <tr><td>„Gleiche Namen – bitte unterscheiden“</td><td>Bei den markierten Einträgen den Nachnamen oder einen Anfangsbuchstaben ergänzen – oder doppelte Einträge weglassen.</td></tr>
  <tr><td>Tisch lässt sich nicht drehen</td><td>Zu wenig Platz zur Wand oder zum Nachbartisch. Erst etwas wegschieben, dann drehen.</td></tr>
  <tr><td>Ergebnis gefällt nicht</td><td>Einzelne Konflikte mit „Beheben“ lösen – oder nochmal ${k("shuffle","Neu anordnen")}; jeder Durchlauf ist neu. Gute Teile vorher fixieren.</td></tr>
  <tr><td>Versehentlich etwas gelöscht</td><td>${k("undo")} oder <span class="kbd">Strg</span>+<span class="kbd">Z</span>.</td></tr>
  <tr><td>„Nicht gespeichert“</td><td>Antippen, Grund lesen, sofort eine Sicherung herunterladen. Häufigste Ursache: ein privates Browserfenster.</td></tr>
  <tr><td>„stammt aus einer neueren Fassung“</td><td>Die Sicherung wurde mit einer neueren Version erstellt – bitte diese verwenden.</td></tr>
  <tr><td>Plan wirkt klein</td><td>Mit + zoomen oder im Raum leere Randspalten mit den Pfeilen am Rand wegnehmen. Der Ausdruck ist davon nicht betroffen.</td></tr>
</table>
</div>

<div class="card" id="h15">
<h3>15. Bedienung mit der Tastatur</h3>
<table>
  <tr><th>Wo</th><th>Taste</th><th>Wirkung</th></tr>
  <tr><td>überall</td><td><span class="kbd">Strg</span>+<span class="kbd">Z</span> / <span class="kbd">Strg</span>+<span class="kbd">Umschalt</span>+<span class="kbd">Z</span></td><td>Rückgängig / Wiederholen (nicht beim Tippen in Textfeldern)</td></tr>
  <tr><td>Bereiche</td><td><span class="kbd">←</span> <span class="kbd">→</span>, dann <span class="kbd">Eingabe</span></td><td>zwischen Sitzplan, Raum und Klasse wechseln</td></tr>
  <tr><td>Menü</td><td><span class="kbd">↑</span> <span class="kbd">↓</span>, <span class="kbd">Esc</span></td><td>durch die Einträge gehen, schließen</td></tr>
  <tr><td>Sitzplan</td><td>Pfeiltasten</td><td>zum benachbarten Platz</td></tr>
  <tr><td>Sitzplan</td><td><span class="kbd">Eingabe</span> / <span class="kbd">Leertaste</span></td><td>Person auswählen; auf dem Zielplatz: tauschen oder umsetzen</td></tr>
  <tr><td>Sitzplan</td><td><span class="kbd">F</span></td><td>Platz fixieren oder lösen</td></tr>
  <tr><td>Sitzplan</td><td><span class="kbd">Entf</span></td><td>Person vom Platz nehmen</td></tr>
  <tr><td>Raum</td><td>Pfeiltasten, <span class="kbd">R</span>, <span class="kbd">Entf</span></td><td>Tisch oder Möbel verschieben, um 90° drehen, löschen</td></tr>
  <tr><td>Raum</td><td><span class="kbd">Q</span> / <span class="kbd">E</span> oder <span class="kbd">Umschalt</span> + Mausrad</td><td>Tisch in 5°-Schritten drehen</td></tr>
  <tr><td>Platzmerkmale</td><td>Tippen, <span class="kbd">↓</span> <span class="kbd">↑</span>, <span class="kbd">Eingabe</span>, <span class="kbd">Esc</span></td><td>Person suchen, in der Liste wählen, übernehmen, Liste schließen</td></tr>
  <tr><td>Raum</td><td><span class="kbd">Eingabe</span> auf einem Platz</td><td>Platz rechts bearbeiten (Merkmale, Sperren)</td></tr>
  <tr><td>Dialoge</td><td><span class="kbd">Esc</span></td><td>schließen; der Fokus kehrt an die vorige Stelle zurück</td></tr>
</table>
<p>Für Screenreader sind alle Plätze beschriftet („Anna, Tisch 3, Platz 2, fixiert“); Tausch, Auswahl und Rückgängig werden angesagt.</p>
</div>
</div>
</div>`;
  el("helpBack").onclick=function(){showTab(S.hilfeVon==="help"?"plan":S.hilfeVon);};
  hilfeEinrichten();
}
/* ---- Anleitung: breite Darstellung, Suche, mitlaufendes Inhaltsverzeichnis ---- */
/* Lange Abschnitte bekommen die volle Breite; ihre Unterabschnitte stehen nebeneinander. */
function hilfeGliedern(main){
  Array.prototype.slice.call(main.children).forEach(function(c){
    if(!c.classList.contains("card"))return;
    var h4=c.querySelectorAll(":scope > h4"),lang=c.textContent.length;
    if(h4.length>=2&&lang>1600){
      c.classList.add("breit");
      var subs=document.createElement("div");subs.className="hsubs";
      var cur=null;
      Array.prototype.slice.call(c.childNodes).forEach(function(n){
        if(n.nodeType===1&&n.tagName==="H4"){cur=document.createElement("div");cur.className="hsub";subs.appendChild(cur);}
        if(cur)cur.appendChild(n);
      });
      c.appendChild(subs);
    }else if(lang>2400)c.classList.add("breit");
  });
}
/* Ein schmaler Abschnitt ohne Nachbarn in seiner Zeile (weil der nächste breit oder ausgeblendet ist)
   nimmt die ganze Zeile ein – so entstehen keine leeren Flächen neben ihm. */
function hilfeLuecken(main){
  var karten=Array.prototype.slice.call(main.children).filter(function(c){return c.classList.contains("card")&&!c.hidden;});
  karten.forEach(function(c){c.classList.remove("allein");});
  for(var i=0;i<karten.length;i++){
    var c=karten[i];
    if(c.classList.contains("breit"))continue;
    var n=karten[i+1];
    if(n&&!n.classList.contains("breit")){i++;continue;}
    c.classList.add("allein");
  }
}
/* Treffer der Suche hervorheben (nur Text, keine Symbole) */
function hilfeMarkieren(root,q){
  var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),zahl=0;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),liste=[];
  while(w.nextNode())if(w.currentNode.nodeValue.toLowerCase().indexOf(q.toLowerCase())!==-1)liste.push(w.currentNode);
  liste.forEach(function(t){
    if(zahl>300)return;
    var frag=document.createDocumentFragment(),text=t.nodeValue,last=0,m;
    re.lastIndex=0;
    while((m=re.exec(text))){
      frag.appendChild(document.createTextNode(text.slice(last,m.index)));
      var mk=document.createElement("mark");mk.textContent=m[0];frag.appendChild(mk);zahl++;
      last=m.index+m[0].length;
    }
    frag.appendChild(document.createTextNode(text.slice(last)));
    t.parentNode.replaceChild(frag,t);
  });
}
function hilfeEinrichten(){
  var main=el("hMain"),scroller=el("tabHelp");if(!main||!scroller)return;
  var INHALT=main.innerHTML,links=Array.prototype.slice.call(document.querySelectorAll(".hside .toc a"));
  hilfeGliedern(main);hilfeLuecken(main);
  function aktivSetzen(){
    var grenze=scroller.getBoundingClientRect().top+90,best=null,bestTop=-Infinity;
    Array.prototype.slice.call(main.children).forEach(function(c){
      if(!c.classList.contains("card")||c.hidden)return;
      var t=c.getBoundingClientRect().top;
      if(t<=grenze&&t>bestTop+1){best=c;bestTop=t;}
    });
    if(!best){best=Array.prototype.slice.call(main.children).filter(function(c){return c.classList.contains("card")&&!c.hidden;})[0];}
    links.forEach(function(a){
      var an=!!best&&a.getAttribute("href")==="#"+best.id;
      a.classList.toggle("on",an);
      if(an)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current");
    });
  }
  var spyTimer=null;
  scroller.onscroll=function(){if(spyTimer)return;spyTimer=setTimeout(function(){spyTimer=null;aktivSetzen();},60);};
  links.forEach(function(a){
    a.onclick=function(e){
      e.preventDefault();
      var z=el(a.getAttribute("href").slice(1));
      if(z&&z.hidden){el("helpSuche").value="";suchen();z=el(a.getAttribute("href").slice(1));}
      if(!z)return;
      z.scrollIntoView({behavior:"smooth",block:"start"});
      var h=z.querySelector("h3");if(h){h.tabIndex=-1;try{h.focus({preventScroll:true});}catch(err){}}
      setTimeout(aktivSetzen,400);
    };
  });
  function suchen(){
    var q=el("helpSuche").value.trim();
    main.innerHTML=INHALT;hilfeGliedern(main);
    var n=0;
    Array.prototype.slice.call(main.children).forEach(function(c){
      if(!c.classList.contains("card"))return;
      var an=!q||c.textContent.toLowerCase().indexOf(q.toLowerCase())!==-1;
      c.hidden=!an;
      if(an&&q){n++;hilfeMarkieren(c,q);}
    });
    hilfeLuecken(main);
    links.forEach(function(a){
      var z=el(a.getAttribute("href").slice(1));
      a.classList.toggle("aus",!!q&&(!z||z.hidden));
    });
    var f=el("helpFund");
    f.textContent=!q?"":(n?(n===1?"1 Abschnitt enthält":n+" Abschnitte enthalten")+" „"+q+"“.":"Nichts gefunden – ein anderes Wort versuchen.");
    var leer=el("helpLeer");
    if(q&&!n){
      if(!leer){leer=document.createElement("div");leer.id="helpLeer";leer.className="card hleer";main.appendChild(leer);}
      leer.innerHTML="<p>Zu „"+esc(q)+"“ steht nichts in der Anleitung. Versuche ein anderes Wort, etwa „Drucken“, „Regel“ oder „Tisch“.</p>";
    }
    scroller.scrollTop=0;
    aktivSetzen();
  }
  var suchTimer=null;
  el("helpSuche").oninput=function(){clearTimeout(suchTimer);suchTimer=setTimeout(suchen,120);};
  el("helpSuche").onkeydown=function(e){
    if(e.key==="Escape"&&this.value){e.preventDefault();e.stopPropagation();this.value="";suchen();}
    if(e.key==="Enter"){e.preventDefault();var t=main.querySelector(".card:not([hidden]) mark");if(t)t.scrollIntoView({behavior:"smooth",block:"center"});}
  };
  aktivSetzen();
}
