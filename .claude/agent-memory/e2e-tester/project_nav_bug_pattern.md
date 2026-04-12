---
name: Date Navigator Bug Pattern
description: Ismert hiba-minta: async handler try-catch hiánya miatt a navigátor gomb "néma" sikertelen betöltés esetén — napi_tervezes és napi_rogzites oldalakon javítva 2026-04-07
type: project
---

A dátumnavigátor (btnPrevDay / btnNextDay) handlerekben két hiba-forrás volt:

1. `napi_tervezes.html`: A `getAktivTavollet(planDate)` szinkron hívás exception-t dobhat (`throw err` a crud.js-ben). Ha ez meghiúsult, a handler félbeszakadt — az UI nem frissült, de a dátumváltozó már módosult. Következő kattintásra még egy napot ugrott előre, ami úgy nézett ki mintha a gomb "nem reagálna".

2. Mindkét fájlban: A `loadExistingPlan().then(...)` / `loadDayData()` hívások nem tartalmaztak `.catch()` ágat. Ha az async betöltés hibát dobott, a `updateDatePill()` és `renderRows()` nem futott le — az adott kattintás "elveszett" vizuálisan.

**Javítás (2026-04-07)**:
- Mindkét handler `async`-ra változtatva
- `getAktivTavollet` hívás saját `try-catch`-be csomagolva (fallback: `aktivTavollet = []`)
- `loadExistingPlan` / `loadDayData` hívások `await`-tel és `try-catch`-el kezelve
- `updateDatePill()` azonnali meghívása a dátum-változtatás után (async betöltés előtt), hogy a pill vizuálisan azonnal reagáljon

**Why:** A szinkron exception a handler közepén félbeszakítja a végrehajtást. Async hívás unhandled rejection-je csendben hibázik. Mindkettő "látszólag nem működő gomb" tünetet okoz.

**How to apply:** Minden navigátor/dátum-váltó handler esetén: (1) azonnali UI frissítés a dátumváltoztatás után, (2) szinkron DB hívások try-catch-ben, (3) async betöltés await + try-catch-ben.
