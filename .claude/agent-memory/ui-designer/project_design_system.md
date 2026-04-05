---
name: Pilot Erőforrás — Design System
description: A teljes design rendszer: color palette, tipográfia, spacing, sidebar struktúra a "Calm glow" Paper fájlból
type: project
---

A Pilot Erőforrás app design rendszere a Paper fájlból kiolvasva (2026-04-03).

**Why:** A senior-developer a HTML/CSS implementációhoz használja. Minden érték pixel-pontos, a Paper JSX exportból kiolvasva.

**How to apply:** Minden UI implementációs feladatnál ezekre az értékekre kell hivatkozni. Ne használj más hex értékeket, ne találj ki spacing értékeket.

## Color Palette

| Szerep | Hex | Leírás |
|---|---|---|
| background | #F5F4F1 | Oldal háttér (warm off-white) |
| surface | #FFFFFF | Kártyák, táblázatok háttere |
| surface-alt | #FAFAF8 | Táblázat header sor háttere |
| surface-inactive | #FDFCFB | Inaktív sorok háttere |
| sidebar-bg | #1A1C1E | Sidebar háttér (near-black) |
| sidebar-divider | #2E3033 | Sidebar elválasztó |
| text-primary | #1A1C1E | Fő szöveg |
| text-secondary | #7A6F5E | Másodlagos szöveg (warm mid-tone) |
| text-muted | #A09688 | Halvány szöveg, időbélyegek |
| text-sidebar-inactive | #8A9490 | Inaktív nav linkek a sidebaron |
| accent | #2D6A4F | Elsődleges zöld (forest green) |
| accent-light | #E9F5EE | Zöld háttér (aktív badge, icon bg) |
| accent-text-on-dark | #E9F5EE | Szöveg zöld háttéren (sidebar aktív) |
| border | #E8E6E1 | Általános border |
| border-light | #F0EEE9 | Táblázat sor elválasztó |
| border-dashed | #C8C4BC | Dashed border (új alias input) |
| warning | #E8A030 | Figyelmeztetés / szerviz állapot |
| warning-light | #FEF3DC | Warning badge háttér |
| warning-row-bg | #FFFDF8 | Warning sor háttér (szerviz) |
| error | #C0392B | Törlés gomb, hiányzó tény |
| error-muted | #DDB0AB | Letiltott törlés gomb (inaktív sor) |
| inactive-dot | #D0CCC5 | Inaktív sofőr státusz dot |
| inactive-badge | #F0EEE9 | Inaktív/lezárva badge háttér |
| inactive-badge-text | #7A6F5E | Inaktív badge szöveg |
| icon-inactive | #7A8A7F | Sidebar inaktív ikon szín |
| icon-muted-action | #C0C0B8 | Letiltott szerkesztés ikon |

## Tipográfia

Font family: **Inter**, system-ui, sans-serif
(Geist is betöltve, de a UI-ban Inter van használva)

| Szerep | Méret | Line-height | Font-weight | Letter-spacing |
|---|---|---|---|---|
| brand-label (PILOT) | 11px | 14px | 600 (semibold) | 0.12em (wide) |
| brand-name (Erőforrás) | 18px | 22px | 700 (bold) | -0.02em |
| page-title | 20px | 24px | 700 (bold) | -0.02em |
| page-subtitle | 13px | 16px | 400 (regular) | normal |
| section-heading | 14px | 18px | 600 (semibold) | normal |
| table-header-label | 12px | 16px (text-base/5) | 400 (regular) | normal |
| nav-item | 14px | 18px | 400 regular (inactive) / 500 medium (active) | normal |
| body-text | 13px | 16px | 400 (regular) | normal |
| badge-label | 11px | 14px | 600 (semibold) | normal |
| timestamp / caption | 11px | 14px | 400 (regular) | normal |
| button-primary | 13px | 16px | 600 (semibold) | normal |
| button-secondary | 14px | 20px (text-base/5) | 400 (regular) | normal |
| form-label | 11px | 14px | 600 (semibold) | 0.06em |
| stat-number | 36px | 44px (text-4xl/11) | 700 (bold) | -0.03em |

## Color kiegészítések (Napi tervezés artboard)

| Szerep | Hex | Leírás |
|---|---|---|
| row-bg-approved | #FAFDFB | Jóváhagyott sor háttere (zöldes tint) |
| row-bg-modified | #FFFEF5 | Módosított sor háttere (amber tint) |
| modified-field-bg | #FFFEF5 | Módosított mező pill háttere |
| modified-field-border | #E8D090 | Módosított mező pill bordere |
| modified-prev-text | #A09688 | "volt: X" előző érték szöveg szín |
| badge-approved-bg | #E9F5EE | "jóváhagyva" badge háttér |
| badge-approved-text | #2D6A4F | "jóváhagyva" badge szöveg/ikon |
| badge-modified-bg | #FEF3DC | "módosítva" badge háttér |
| badge-modified-text | #C07A10 | "módosítva" badge szöveg |
| badge-manual-bg | #F5F4F1 | "kézi kitöltés" badge háttér |
| badge-manual-border | #E8E6E1 | "kézi kitöltés" badge border |
| ok-btn-bg | #E9F5EE | OK gomb háttér |
| ok-btn-border | #2D6A4F | OK gomb border |
| ok-btn-text | #2D6A4F | OK gomb szöveg/ikon |
| nem-btn-bg | #F5F4F1 | Nem gomb háttér |
| nem-btn-border | #E8E6E1 | Nem gomb border |
| nem-btn-text | #7A6F5E | Nem gomb szöveg/ikon |
| info-banner-bg | #EEF7F2 | Info banner háttér |
| info-banner-border | #C5DDD1 | Info banner border bottom |
| info-banner-text | #2D6A4F | Info banner szöveg/ikon |
| summary-dot-pending | #C8C4BC | Függőben dot szín |

## Spacing kiegészítések (Napi tervezés artboard)

| Kontextus | Érték |
|---|---|
| Dátum pill border | 1.5px solid #2D6A4F |
| Dátum pill padding | py: 6px, px: 14px |
| Dátum pill border-radius | 6px |
| Alap badge padding | py: 5px, px: 12px |
| Alap badge border-radius | 20px |
| OK/Nem gomb padding | py: 4px, px: 9px |
| OK/Nem gomb gap (ikon+szöveg) | 4px |
| OK/Nem gomb gap (egymás között) | 6px |
| Jóváhagyva badge padding | py: 4px, px: 10px |
| Módosított mező pill padding | py: 4px, px: 8px |
| Összefoglaló sáv padding | py: 12px, px: 16px |
| Összefoglaló számlálók gap | 20px |
| Összefoglaló dot-szöveg gap | 6px |
| Info banner padding | py: 10px, px: 32px |
| Info banner ikon-szöveg gap | 10px |

## Color kiegészítések (Napi rögzítés artboard)

| Szerep | Hex | Leírás |
|---|---|---|
| row-bg-saved | #FAFDFB | Mentett/kész sor háttere (zöldes tint) |
| row-bg-error | #FDF8F7 | Hiányos/hibás sor háttere (piros tint) |
| row-bg-active | #FFFFFF | Aktív szerkesztés alatti sor háttere |
| row-border-active | #C5DDD1 | Aktív sor border bottom + input border |
| row-active-ring | #2D6A4F | Aktív sor focus ring (box-shadow inset 2px) |
| input-bg-inactive | #F5F4F1 | Inaktív input / autocomplete háttér |
| input-bg-active-time | #FFFFFF | Aktív "Kezdés" időpont input háttere |
| badge-number-bg | #E8E6E1 | Sor-sorszám badge háttere (szerkesztés alatt) |
| badge-number-color | #7A6F5E | Sor-sorszám badge szöveg |
| badge-ok-bg | #2D6A4F | Kész/mentett badge háttere (zöld) |
| badge-ok-icon | #FFFFFF | Kész badge ikon szín (pipa, 10x10) |
| badge-error-bg | #F5DDD9 | Hiányos badge háttere (piros tint) |
| badge-error-icon | #C0392B | Hiányos badge "!" szöveg |
| dashed-btn-border | #C8C4BC | "+ Új sor" dashed border |
| dashed-btn-bg | #FAFAF8 | "+ Új sor" gomb háttere |
| dashed-btn-text | #7A6F5E | "+ Új sor" szöveg és ikon szín |
| progress-track | #E8E6E1 | Progress bar háttér sín |
| progress-fill | #2D6A4F | Progress bar kitöltés |

## Spacing rendszer

Alapegység: 4px. Minden érték 4px többszöröse.

| Kontextus | Érték |
|---|---|
| Sidebar width | 240px (w-60) |
| Sidebar logo padding | pt: 28px, pb: 24px, px: 24px |
| Sidebar nav area padding | py: 16px, px: 12px |
| Nav item padding | py: 10px, px: 12px |
| Nav item gap (icon + text) | 10px |
| Nav item border-radius | 6px (rounded-md) |
| Nav item divider margin | my: 8px |
| Sidebar bottom padding | py: 16px, px: 12px |
| Main header height | 64px (h-16) |
| Main header padding | px: 32px |
| Main content padding | py: 24px, px: 32px |
| Napi rögzítés content padding | py: 20px, px: 32px, gap: 12px |
| Table row height (kész) | 41px (py: 10px + 20px line-height + 1px border) |
| Table row height (aktív szerk.) | 55px (py: 10px + 34px input + 1px border) |
| Table row height (header) | 61px (py: 10px + 40px label + 1px border) |
| Table header bg | #FAFAF8 |
| Table container border-radius | 8px |
| Table container border | 1px solid #E8E6E1 |
| Status badge size | 18x18px, border-radius: 50% |
| Status badge column width | 28px (fixed, centered) |
| Action icon column width | 32px (fixed, flex-end) |
| Inline input padding | py: 6px, px: 10px (autocomplete) / px: 8px (időpont, munkaóra) |
| Inline input border-radius | 5px |
| Inline input active border | 1.5px solid #2D6A4F |
| Inline input inactive border | 1px solid #C5DDD1 |
| Card/table border-radius | 8px (rounded-lg) |
| Table header padding | py: 11px, px: 20px |
| Table row padding | py: 13px, px: 20px |
| Form panel width | 320px |
| Form panel header padding | py: 20px, px: 24px |
| Form field gap | 16px |
| Form label-to-input gap | 6px |
| Form footer padding | py: 16px, px: 24px |
| Badge padding | py: 3px, px: 8px |
| Badge border-radius | 4px (rounded-sm) |
| Search input padding | py: 8px, px: 14px |
| Search input gap | 8px |
| Primary button padding | py: 9px, px: 18px |
| Primary button gap | 8px |
| Primary button border-radius | 6px (rounded-md) |
| Status dot size | 10px (size-2.5) |
| Activity dot size | 8px (size-2) |
| Machine icon box size | 32px (size-8) |
| Machine icon box border-radius | 6px (rounded-md) |
