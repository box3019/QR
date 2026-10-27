# QR (Quote Request) & Route Prep — спецификация (v0.1, 27.10.2026)

Рабочее название: **Quote Request** (переименуем по желанию). Новая отдельная desktop-программа (v0.2: ответы владельца учтены). Заменяет модуль Quote Request + cost estimate в MRT_2026 (box3019/MRT-Inspect). В MRT этот модуль удаляется полностью.

## 1. Цель и границы
- Работает **до** того, как деталь попадает в ERP: quoting, order intake, подготовка route card. **Никакого ERP connection** (ни чтения, ни записи).
- Пользователь: инженер. **No PIN/login**: программа открывается сразу.
- **Cost/pricing OUT OF SCOPE**: цены определяет владелец предприятия. Никаких cost sheets и price cells. Pricing — возможная поздняя фаза.
- Вне scope: CMM program, FAI, балоны, любые цены.

## 2. Требования
### 2.1 UI
- Визуальный стиль **точно как MRT**: те же components, tokens, fonts, palette (Priority-like, строгий).
- Весь UI на одном языке (English), без смешивания языков. Customer Questions экспортируются на **Hebrew (default)** или English: выбор в Settings и в диалоге Export, для Hebrew — RTL layout (PDF/DOCX). Main UI всегда English.
- Base font **14px** плюс Settings → General → **Text size** (Small 13 / Normal 14 / Large 16 / X-Large 18), через CSS var `--mrt-font-scale`.
- **One window**: drop zone на весь экран, файлы сразу начинают обрабатываться.

### 2.2 Ввод
- Drag & drop: PDF drawings, STEP/STP/IGES models, customer ZIP (рекурсивно, вложенные ZIP), PARTS LIST PDF, Excel/CSV.
- Классификация файлов: drawing / parts list / model / spec document / unknown.

### 2.3 Drawing ↔ 3D model matching
- Ключ: part number + rev из title block и имени файла, fuzzy (`BQ43596A`, `BQ43596A_revA.stp`).
- Где искать: 1) сам drop; 2) папка чертежа; 3) `\\fileserver-sr\erp$\Inspection\<customer>\<part>\PAS PROGRAMS` (**только чтение**).
- Fast model load: STEP грузится в worker, кэш tessellation (glTF/binary) по sha256 файла.
- Ручное перепривязывание в UI. Статус «— none —» показывается с причиной (где искали).

### 2.4 Material detection + allow-list
- «Materials we work with» (Settings): Aluminium, Bronze, Copper/Brass, Plastics по умолчанию. Редактируемый список: aliases, regex.
- Отклонённая деталь остаётся в списке как **Rejected** с причиной («Material: CRES 17-4PH — not in allow-list»). Её можно вручную принять (Override).
- Обязательные исправления парсера (баг KLA, см. §8.3):
  - нормализация `_`, `-`, пробелов: `AL_6061-T651` → `AL 6061-T651`;
  - значение ищется справа **и под** label MATERIAL (по геометрии ячейки title block);
  - `SEE NOTES`, `SEE PLM`, `N/A` — не материал; при `SEE NOTES` материал ищется в NOTES;
  - источники по приоритету: PARTS LIST → routing chart (RAFAEL 20) → title block → notes.

### 2.5 Text extraction с fallback (MANDATORY MVP)
«Мёртвые» чертежи — это не только сканы, но и CAD vector PDF с outlined text (текст нарисован линиями и кривыми, text layer нет), а также PDF со сломанным font encoding (garbage text).
- **Per page** (и per region) quality check:
  - `no_text`: на странице нет text layer;
  - `low_ratio`: glyphs / vector path ops ниже порога (например, < 0.02 на A0/A1). На чертеже «много линий и мало текста» значит, что dims, скорее всего, outlined;
  - `garbage`: доля unmapped glyphs (нет ToUnicode, PUA, `\uFFFD`), низкая доля словарных токенов и шаблонов (`M\d+X`, `\d+\.\d+`, `UNC`) или редкие bigrams;
  - `region_gap`: в регионе есть dimension lines/arrows, но рядом нет текстовых чисел. Это outlined dimensions.
- Fallback: render 400–600 DPI (pdftoppm/pdfium) → OCR (Tesseract 5 + словарь engineering terms; позже PaddleOCR как опция) **per region**.
- Vector analysis в помощь OCR:
  - dimension lines + arrowheads → где ожидать dimension text;
  - table grid lines → ячейки title block, routing chart, revision table (OCR по ячейкам, сохраняется table structure).
- Mixed pages: real text и OCR сливаются по bbox. Real text приоритетнее, OCR заполняет только пустые регионы. У каждого токена есть `source: text|ocr` и `confidence`.
- В UI у страницы есть badge (Text / Mixed / OCR) и подсветка low-confidence. Checks на OCR-данных помечаются «verify» и не дают ложной уверенности.
- Наблюдения по тестовым PDF (pdffonts/pdftotext, 27.10):
  - **BQ43596A (drwcheck/d.pdf)**: шрифт один (CourierNewPSMT, embedded subset, **uni=no**, т.е. ToUnicode нет). Text layer маленький (~2.7 KB, всего 28 десятичных чисел), при этом notes, table и routing chart извлекаются. **Dimension values на видах, по-видимому, outlined** → нужен region OCR. Сама callout-строка THD извлекается.
  - **ELTA ex1.pdf (A0)**: ArialUnicodeMS Identity-H (uni=yes) + Helvetica. Notes и многие dims извлекаются (132 числа), garbage не найдено. Нужен coverage check по dimension lines: часть видов может быть outlined.
  - **ELTA ex2.pdf (PARTS LIST)**: чистый text (Helvetica/Times), fallback не нужен.
  - **KLA matbug/d.pdf**: CourierNewPSMT без ToUnicode, но текст читается (192 числа). Material не нашёлся из-за парсера (§2.4), а не из-за encoding.
  - Вывод: «без ToUnicode» ≠ garbage, качество нужно мерить по содержимому, а не по флагу шрифта. Точную долю outlined dims надо подтвердить vector-анализом на этапе MVP.

### 2.6 Order summary и выход
- **Без цен.** Order summary = список parts: part no/rev, status (Accepted/Rejected/Pending + reason), material, problems count (by severity), route-card readiness (Ready / Blocked by N tasks / Incomplete), model found.
- Export (XLSX + PDF): order summary + route cards только accepted parts; Customer Questions отдельно (Hebrew/English).

### 2.7 Drawing problem checks
Перед release to production показывается **Problems list**, который экспортируется как Customer Questions (PDF/DOCX/email text; Hebrew RTL по умолчанию или English). Severity: Blocker / Question / Info.
- Missing datums: feature control frame ссылается на datum, которого нет на чертеже; позиционные допуски без DRF.
- Nonsensical dimensions: допуск шире самого размера, min > max, неизвестные thread sizes, глубина резьбы больше толщины (по 3D), дубль размера с другим значением.
- Duplicated/contradictory callouts: view vs table/BOM/PARTS LIST, notes vs routing chart, material title block vs routing.
- Threads vs inserts: для каждого insert из BOM берётся требуемый tapped hole (каталог insert-ов: helical coil, key-locked, heavy-duty с outer thread). Затем сверяются size/pitch/qty с callouts на видах. Пример предложения: «вероятно верна table».
- Каждый пункт содержит: что не так, где (page + bbox, клик → zoom), предполагаемый правильный вариант, источник/confidence.

### 2.8 Customer routing profiles → Route card
Профиль заказчика (JSON/YAML, редактируемый, версионируемый) описывает, где взять шаги и как их сопоставить с нашими операциями.
- **RAFAEL**: таблица `PRODUCTION ROUTING CHART` на чертеже: 10 General, 20 Material (cat.no/qty/UM, 20.x sub-items), 30 Machining, 40 Marking, 50 Surface treatment, 60 Inserts, 70 Inspection, 80 Final approval, 90 Packing.
- **ELTA** (подтверждено: 9006Y108-002 — ELTA): process steps в drawing NOTES (нумерованные) + отдельный PARTS LIST PDF (Seq / Part No / Catalog No / Qty / UoM / Make-Buy, строки `Alt` = альтернативы). Оба источника объединяются.
- **KLA** (третий, по matbug): NOTES + title block («SURFACE TREATMENT: SEE NOTES»), ссылки на внутренние процессы вендора/KLA.
- Профиль определяется по title block/логотипу/формату номера. Unknown → Generic profile (notes + title block).
- Route card: шаги с operation type, описанием, ссылками на spec, материалом/вставками, outsourcing flag. Пустые/неясные шаги попадают в Problems.

### 2.9 References и Document library
- Detect: `SEE ITEM`, `SEE`, `PER`, `IAW`, `IN ACCORDANCE WITH`, `SPECIFICATION`, `DATA`, а также шаблоны номеров (`MIL-[A-Z]+-\d+`, `A-A-\d+`, `AMS[- ]?\d+`, `ASTM [A-Z]\d+`, `FED-STD-\d+`, `NASM\d+`, ELTA `\d{4}[A-Z]\d{3}-\d{3}`, RAFAEL `PS-\d+\.\d+`, `RAFDOCS-\d+`, `GEN_\d+-\d+`).
- Классификация:
  - **Public standard**: короткое описание из встроенной базы (MIL-DTL-5541F chemical conversion coating; A-A-56032 marking ink; AMS 4027 Al 6061-T6 plate; ASTM B221 Al extrusions; AMS-QQ-A-200/8; MIL-PRF-22750 epoxy coating; FED-STD-595 colours; NASM122076 helical inserts).
  - **Customer-internal**: ELTA 1002G151-001 (painting), 1011K500-001 (insert installation), 5902N800-001 (marking); RAFAEL PS-111.21 (RAFDOCS-434847), PS-111.29, GEN_1111-1; KLA 0372869-00X.
- Missing internal document → сначала поиск по номеру в Document library и в **configurable company folder** (read-only; путь пока не дан, задаётся в Settings). Если не найден, создаётся **Engineer task** «Upload 1002G151-001 (painting & colours) — blocks step Painting / pricing». Из Problems list документ загружается drag & drop.
- После upload: parse (тот же pipeline, включая OCR fallback) → извлечённые параметры (coating, colour, thickness) → заполнение шага route card → сохранение в **Document library** (key: customer + number + rev, sha256). При следующей встрече номера документ используется повторно. Если rev изменилась, это попадает в Problems.

## 3. Что переиспользовать из MRT_2026 (read-only осмотр worktree cmm-pr3)
Найдено в worktree (на ветке 9.0.50-разработки):
- **Theme/styles**: `src/styles/tokens.ts`, `src/tokens.ts`, `src/theme/*` (MrtAppearanceContext, mrtPaletteTokens, mrtPalettePresets, useMrtPaletteCssVars, mrtThemeDocumentSync), `src/index.css`, `src/mrtLiquidGlass.css`, `src/workspaceTheme.ts`.
- **Dialogs/components**: `MrtPdfExportResultDialog`, `MrtPdfFileLockDialog` (UNC/file-lock), общие buttons/tables/settings panels.
- **STEP loader**: `src/cmm/mrtCmmStepLoad.ts`, `mrtCmmOccStepLoad.ts` (OCC), `mrtCmmStepParse.ts`, `mrtCmmStepIo.ts`.
- **PDF**: pagination engine и official PDF export (см. `docs/TECHNICAL_REPORT_OFFICIAL_PDF_EXPORT.md`, verify-pdf-*), `src/fai/mrtFaiPdfBalloonImport.ts` (PDF text extraction).
- **Quote Request specific**: material parser, «Materials we work with» allow-list, RFQ session storage, PDF/XLSX templates (cost sheet переносить не нужно — pricing out of scope). В этом worktree поиск по `quote request`/`costEstimate` ничего не дал: модуль, видимо, лежит в release/9.0.47–9.0.49 под другими именами. **TODO**: снять точный список файлов с ветки `release/9.0.49` (git grep) до начала Phase 0. Мой поиск прервался по таймауту, сам worktree я не менял.
- Способ переноса (решение владельца): **копировать** нужный код и стили MRT в репозиторий QR как собственные файлы QR (без shared package, без ссылок на репозиторий/worktree MRT в runtime и build). Дальше QR и MRT развиваются независимо; при необходимости фиксы переносятся вручную.

## 4. Архитектура
**Решение владельца: QR — полностью отдельный проект** (не monorepo, без shared packages):
- свой git-репозиторий `qr-app` (локально `C:\Users\AlexK\agent-tools\qr-app`, позже push в новый GitHub repo);
- свой package (`name: qr`), `appId: com.box3019.qr`, `productName: QR`, свой installer `QR_v<version>_Setup.exe`, своя иконка, свой README;
- код и стили MRT (index.css, mrtLiquidGlass.css, палитра Industrial Steel, классы кнопок, шаг Text size 1.2/1.35/1.5) скопированы в `qr-app/src` как файлы QR;
- MRT не меняется и не рефакторится.

Стек: Electron + TypeScript + React (как MRT).
- Main process: файловая система, ZIP, OCR, поиск на fileserver.
- Worker threads: pdf.js/pdfium text + vector ops, Tesseract (tesseract.js или bundled tesseract.exe), OCC для STEP.
- Storage: SQLite (better-sqlite3) в `%APPDATA%\Quote Request\` + project folder на диске. Document library — общая папка на fileserver (настраивается) + индекс.

## 5. Data model (основное)
```
Project/RFQ {id, customer, createdAt, status, files[], parts[], settings snapshot}
SourceFile {id, path, sha256, kind: drawing|partsList|model|spec|zip|unknown, pages[]}
Page {n, size, textQuality: text|mixed|ocr, tokens[] {text,bbox,source,conf}, regions[]}
Part {id, partNo, rev, name, customerProfile, drawingFileId, modelFileId?, modelSearchLog[],
      material {raw, normalized, family, source, conf}, status: accepted|rejected|pending, rejectReason,
      qty?, routeCard, problems[], references[]}
RouteStep {seq, type: general|material|machining|marking|surface|inserts|inspection|approval|packing|other,
           text, params{}, specRefs[], outsourced, sourceRef{fileId,page,bbox}}
BomLine {seq, partNo, catalogNo, desc, qty, uom, makeBuy, alternatives[]}
Problem {id, partId, severity, category, message, evidence[{fileId,page,bbox,text}], suggestion, status: open|asked|resolved}
Reference {raw, number, rev?, kind: public|internal|unknown, customer, description, docId?}
LibraryDoc {customer, number, rev, path, sha256, extracted{}, uploadedBy, date}
EngineerTask {id, type: uploadDocument|verify|chooseModel, refId, status}
OrderSummaryRow {partId, status, material, problemsBySeverity, routeCardReadiness, modelFound}  // без цен
CustomerProfile {id, detect{}, routingSource: table|notes|partsList, mapping{}, refPatterns[]}
```

## 6. Pipeline
1. Ingest: распаковка ZIP, sha256, dedupe, classify.
2. Extract per page: text layer + vector ops → quality check → OCR fallback per region → merge.
3. Layout: title block, routing chart, revision table, notes, parts list (grid detection).
4. Identify part (partNo/rev), customer profile.
5. Match model: drop → drawing folder → PAS PROGRAMS; фоновый load + кэш.
6. Material → allow-list → accepted/rejected.
7. Parse routing (по profile) + BOM/PARTS LIST merge.
8. References → classify → library/folder search → tasks.
9. Checks → Problems.
10. Build route card + order summary row (readiness).
11. Review → export (accepted only) + Customer Questions (Hebrew/English).
Каждый шаг идёт инкрементально: UI обновляется по мере готовности, ошибка одной детали не ломает остальные.

## 7. Экраны (single main window)
- **Top bar**: Project name/customer, Settings, Export.
- **Left**: список parts (status chip Accepted/Rejected/Pending, problems count, page quality badge). Пустой проект = большая drop zone.
- **Center**: tabs `Drawing` (PDF viewer, overlays problems/OCR regions) | `3D` | `Route card`.
- **Right / bottom panel**: **Problems** (группировка по severity, клик → bbox на чертеже, Resolve/Ask customer) и **Tasks** (upload missing docs, drop прямо в задачу).
- **Order summary**: отдельный maximizable view — список parts со status/material/problems/readiness, без цен.
- **Settings**: General (Customer Questions language: Hebrew default / English, Text size, theme), Materials we work with, Customer profiles, Document library & company folder, Search paths, OCR (DPI 400/600, language).

## 8. Acceptance test cases
### 8.1 RAFAEL BQ43596A rev A (`drwcheck/d.pdf`)
- View: `8 X THD FOR M8_LIGHTWEIGHT KEY-LOCKED INSERT / THD M12X1.25-6H x13.50 MIN`.
- Table item 1: `INSERT HEAVY DUTY M8X1.25, OUTER THREAD M14X1.5, L. 14 MM NON LOCKING, CRES 303 402030755`, 8 EA.
- Ожидается **Blocker/Question**: «Tapped hole M12X1.25 on view does not match insert 402030755 (outer thread M14X1.5). Table likely correct → M14X1.5. Also view says key-locked lightweight, table says heavy-duty non-locking». Qty 8 = 8 совпадает.
- Routing chart: распознаны шаги 10, 20 (ASTM B221 / AMS-QQ-A-200/8, GEN_1111-1, 20.2 alt size), 40, 50 (PS-111.21 / RAFDOCS-434847), 60 (60.1 PS-111.29 inhibitor), 80, 90.
- References: ASTM B221 и AMS-QQ-A-200/8 → public; PS-111.21, PS-111.29, RAFDOCS-434847, GEN_1111-1 → internal → tasks, если их нет в library.
- Text: dims на видах проверяются через OCR fallback (страница = Mixed).
### 8.2 ELTA 9006Y108-002 DRIVER HOUSING (`ex1.pdf` + `ex2.pdf`)
- Notes 1–9 → шаги: deburr, UG model master, Alodine MIL-DTL-5541F Type I Class 1A, painting SEE ITEM 1002G151-001, ink A-A-56032 Type II black, engraving fill MIL-PRF-22750 / FED-STD-595, inserts installation 1011K500-001, marking 5902N800-001.
- Parts list: material 6061-T651 plate 2.25" AMS 4027N (cat 401469759); inserts #2-56 x10 (MS122095 + Alt), #4-40 x7, #6-32 x4 (+ Alt).
- Threads `.086-56`, `.112-40`, `.138-32 UNC` ↔ inserts: **match**, problem не создаётся (проверка «no false positive»). Qty сверяется с числом отверстий на видах, если их удаётся посчитать.
- 1002G151-001, 1011K500-001, 5902N800-001 → internal → Engineer tasks «Upload»; painting step = blocked until upload.
### 8.3 KLA LBC FORK FINGER (`matbug/d.pdf`)
- Title block: `MATERIAL:` label, значение `AL_6061-T651` строкой ниже, рядом `SURFACE TREATMENT: SEE NOTES`.
- Ожидается: material = Aluminium 6061-T651 → Accepted. «SEE NOTES» не принимается за материал. Surface treatment берётся из notes 12–13 (electroless nickel, DLC by Plascotec internal process) → internal vendor refs + outsourcing.
- Регресс: старые 22-A10459, 22-059306.

## 9. Фазы
- **Phase 0 (prep)**: создать отдельный репозиторий `qr-app`, скопировать нужные стили/компоненты MRT как файлы QR; MRT не трогаем (удаление Quote Request из MRT — отдельное решение владельца).
- **Phase 1 — MVP**: one window без login + drop/ZIP; text extraction + **обязательный OCR/vector fallback**; part ID; model matching + кэш; material + allow-list (фикс KLA); Problems list (threads vs inserts, view vs table) + **Customer Questions export Hebrew RTL / English**; References detect/classify + upload tasks; профили RAFAEL, ELTA, KLA; route card (read-only) + order summary без цен; export accepted only. Acceptance = §8.
- **Phase 2**: **наш route-card template** (ждём от пользователя) → редактируемая route card + PDF export в нашем формате; Document library с парсингом загруженных документов и автозаполнением шагов; поиск по company folder (когда будет путь); checks datums/nonsensical dims; профили новых заказчиков по присланным чертежам.
- **Phase 3**: редактор customer profiles в UI; 3D-assisted checks (глубина резьбы, число отверстий); suggestions coatings/suppliers; передача route card в MRT/ERP файлом.
- **Possible later**: pricing/cost sheets — только если владелец решит.

## 10. Открытые вопросы
Решено: без PIN; pricing out of scope; вопросы Hebrew (default)/English; 9006Y108-002 = ELTA.
Ждём от пользователя: наш route-card template; чертежи других заказчиков (2–3 на каждого); путь к папке документов заказчиков.
1. ~~Monorepo или отдельный repo?~~ Решено: отдельный repo `qr-app`, код MRT копируется.
2. ~~Название~~ Решено: «QR» (Quote Request).
3. Publish: отдельная Production папка и installer, тот же порядок («Да, выложи в Production»)?
4. Формат Customer Questions: PDF, Word или текст для email (или все)?
5. OCR только локально (без облака) — подтверждаем?

## Outlook 2021 "Send to QR" button (v0.1.4)

**What it does.** One ribbon button, "Send to QR", in the Home tab (main window) and the Message tab (an opened e-mail). It works on the open e-mail or on all e-mails selected in the list. One click saves each e-mail as `.msg` (attachments included) into `%TEMP%\qr-outlook\<time>\`, then starts `QR.exe --import <folder>`. If QR is already running, the single-instance lock hands the folder to the open window; otherwise QR starts and imports once the window has loaded. Nothing is sent.

**Choice: per-user COM add-in (plain .NET 4, no VSTO).**
- `outlook-addin/QRAddin.cs` implements `IDTExtensibility2` + `IRibbonExtensibility` (interfaces declared in the source, no Office interop assemblies needed). It is built by `scripts/build-addin.cjs` with the `csc.exe` that ships in .NET Framework 4, so neither Visual Studio nor the VSTO runtime is needed.
- The QR NSIS installer (`build/installer.nsh`) registers it under **HKCU only**: `Software\Classes\CLSID\{6C1D5E0A-…}` (InprocServer32 = mscoree.dll + CodeBase to `resources\outlook-addin\QR.OutlookAddin.dll`), in both registry views, and `Software\Microsoft\Office\Outlook\Addins\QR.OutlookAddin` with LoadBehavior 3. It also writes QR's location to `HKCU\Software\QR\ExePath`, which the add-in reads. The uninstaller deletes all these keys.
- No macros, no admin rights, no Trust Center changes.

**Rejected options.**
- VSTO: needs Visual Studio to build and the VSTO runtime plus a ClickOnce trust prompt.
- Web add-in + `qr://` protocol: sideloading needs Exchange/M365 support. A web add-in also cannot save `.msg` with its attachments to disk; it would need Graph/EWS tokens to download them.
- VBA macro: needs macros enabled.

**Limits.** QR has to be reinstalled after it is moved. If Outlook marks the add-in as slow or disabled, re-enable it in File › Options › Add-ins › COM Add-ins.

## Wizard (approved design, v0.1.4)
Source: ref/paperless/analysis.md, "Proposal for QR" (approved by Alex). Header on every step: QR, RFQ/customer, the step bar (1 Intake, 2 Check parts, 3 Documents & questions, 4 Summary; any step is clickable once there are parts), Settings, Help. One hint line and one main button per step. Secondary things open on demand. No prices.

- **Step 1, Intake:** a big drop zone (e-mail / RAR / ZIP / PDF) and "Choose files". The customer is detected automatically. The log and OCR settings sit behind Details. The main button is "Next".
- **Step 2, Check parts:** three columns.
  - Left: the parts list grouped by status (Ready / Needs document / Needs customer answer / Not ours) with counters.
  - Centre: the drawing.
  - Right: the part card, with the part number (bold) and rev, and "part i of n".
  - The card shows, in fixed order:
    - flags on top (red if blocking, amber if warning);
    - then the friend's (notes_extractor.py) sections: Material, Heat treat, Coatings (in order), Paint, Other processes (only if any), Masking (method, areas, before/SEQ), Operation sequence (routing table, numbered).
  - Each section is one line: `LABEL value [standard] flags`. An empty section shows in grey as "not on drawing"; it is never hidden.
  - Clicking a section expands all of the friend's fields for it, and zooms and highlights the source text on the drawing.
  - Each section has exactly one action: Confirm, Add question (flagged or missing), or Upload standard (NO STANDARD).
  - Raw NOTES rows and the friend's Excel are behind "Show table".
  - The card footer has "◀ Previous" and "Next part ▶". On the last part, the button becomes "Next: documents & questions".
- **Step 3, Documents & questions:** two boxes, "To upload (n)" and "Questions for the customer (n)". References and info are behind "Show references".
- **Step 4, Summary:**
  - an amber bar "n parts with open flags → Go to part";
  - a totals line (parts, per-group counts, questions);
  - two main exports: Questions and Excel (the friend's format);
  - the full report is behind "Show report".
- **Typography:** labels are small grey caps (400). Values are regular (400). Bold (600) is only for part numbers and section or status headers. Line-height is 1.55.
- **Tests:**
  - tests/friend_fields_ui.test.cjs checks that every column the friend's script writes (Material, Processes, Masking, Process summary) maps to a field that the card renders, with EN and HE labels.
  - The parity check (scripts/friend/compare.cjs) must stay at 0 differences.

