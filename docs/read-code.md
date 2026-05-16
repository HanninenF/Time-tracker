• Ja. Börja inte med alla filer. Läs flödet i den ordning datan rör sig.

1. Börja i appens root
   Öppna src/app/app.html.

Där ser du hela sidan uppifrån och ned:

  <app-stopwatch />
  <app-manual-entry />
  <app-daily-summary />
  <app-sessions-list />

Det säger vilka “features” appen består av.

2. Gå till root-logiken
   Öppna src/app/app.ts.

Läs särskilt:

- ngOnInit()
- onSessionUpdated()
- onManualSessionSaved()
- onEditSaved()
- onDeleteRequested()
- reloadSessionsAndNotifyWorkSessionChange()

Det här är appens centrala samordnare. Den äger listan över work sessions och säger till Daily Summary när work sessions ändrats.

3. Läs service-lagret
   Öppna src/app/services/time-tracking.service.ts.

Här ser du frontendens API-kontrakt:

- loadSessions
- addWorkSession
- updateWorkSession
- deleteWorkSession
- loadWorkSessionsForDate
- loadWorkDaySummary
- saveWorkDaySummary
- deleteWorkDaySummary

När du undrar “var sparas det?” eller “vilket API anropas?”, börja här.

4. Läs backend efter service-metoden
   Öppna server.js.

Matcha service-metoderna mot routes:

GET /api/sessions
POST /api/sessions
PUT /api/sessions/:sessionId
DELETE /api/sessions/:sessionId

GET /api/work-day-summaries/:date
PUT /api/work-day-summaries/:date
DELETE /api/work-day-summaries/:date

Där ser du också SQLite-tabellerna:

- work_sessions
- work_day_summaries

5. Läs Daily Summary inifrån och ut
   Börja med src/app/features/daily-summary/daily-summary.component.ts.

Den är “feature controller” för daily summary:

- fångar dagens datum
- laddar work sessions för datumet
- laddar sparad summary
- sparar/redigerar/tar bort summary
- reagerar när work sessions ändras

Sedan läser du:

- src/app/features/daily-summary/daily-summary-editor/daily-summary-editor.component.ts
- src/app/features/daily-summary/saved-daily-summary/saved-daily-summary.component.ts

Editor = textarea och save/cancel.
Saved = collapsible display, markdown rendering, edit/delete-knappar.

Mental modell
Tänk så här:

UI-komponent
-> emit event
-> parent component
-> service method
-> Express route
-> SQLite table
<- response
<- update Angular signal
<- UI renderas om

Exempel: ändra en work session:

sessions-list
-> editSaved
-> App.onEditSaved()
-> timeTrackingService.updateWorkSession()
-> PUT /api/sessions/:id
-> UPDATE work_sessions
-> reloadSessionsAndNotifyWorkSessionChange()
-> sessions-list uppdateras
-> daily-summary laddar om sessions för captured date

Det är bästa sättet att läsa koden: följ ett användarflöde från klick till databas och tillbaka.
