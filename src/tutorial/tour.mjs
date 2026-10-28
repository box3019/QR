// Guided tour: spotlight on a real element, a short card, Back / Next / Skip and step dots.
// stage = wizard step the card belongs to (per-step "?" shows only those cards).
// demo = small illustration shown in the card when the real element is not on screen (nothing loaded yet).
export const TOUR = [
  { id: 'outlook', stage: 1, target: 'dropzone', demo: 'outlook' },
  { id: 'drop', stage: 1, target: 'btn-choose-files', demo: 'drop' },
  { id: 'import', stage: 1, target: 'import-view', demo: 'import' },
  { id: 'groups', stage: 2, target: 'parts-panel', demo: 'groups' },
  { id: 'drawing', stage: 2, target: 'drawing-viewport', demo: 'drawing' },
  { id: 'card', stage: 2, target: 'route-card', demo: 'card' },
  { id: 'flags', stage: 2, target: 'wiz-footer', demo: 'actions' },
  { id: 'docs', stage: 3, target: 'step-3', demo: 'docs' },
  { id: 'summary', stage: 4, target: 'btn-export-xlsx-all', demo: 'exports' },
  { id: 'tabs', stage: 0, target: 'tabs', demo: 'tabs' },
  { id: 'history', stage: 0, target: 'btn-history', demo: null },
  { id: 'assistant', stage: 0, target: 'btn-assistant', demo: null },
  { id: 'settings', stage: 0, target: 'btn-settings', demo: null },
];

export const TOUR_TEXT = {
  he: { dir: 'rtl', name: 'עברית',
    ui: { tipDrag: 'גררו להזזה, לחיצה כפולה לאיפוס המיקום', back: 'הקודם', next: 'הבא', skip: 'דילוג', done: 'סיום', of: 'מתוך', lang: 'שפת ההדרכה', tipBack: 'לכרטיס הקודם', tipNext: 'לכרטיס הבא', tipSkip: 'סגירת ההדרכה', tipDot: 'מעבר לכרטיס', watch: '\u05e6\u05e4\u05d4 \u05d1\u05e1\u05e8\u05d8\u05d5\u05df', tipWatch: '\u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05e1\u05e8\u05d8\u05d5\u05df \u05d4\u05d4\u05d3\u05e8\u05db\u05d4', noVideo: '\u05d0\u05d9\u05df \u05e2\u05d3\u05d9\u05d9\u05df \u05e1\u05e8\u05d8\u05d5\u05df \u05d1\u05e9\u05e4\u05d4 \u05d4\u05d6\u05d0\u05ea' },
    demo: { send: 'שליחה ל־QR', drop: 'גררו קבצים לכאן', importing: 'קורא את הקבצים…', ours: 'שלנו', check: 'לבדיקה', notOurs: 'לא שלנו', confirm: 'אישור', ask: 'שאלה', upload: 'העלאה', q: 'שאלות', x: 'גיליון', pdf: 'דוח', tab: 'בקשה' },
    s: {
      outlook: ['מתחילים מהמייל', 'במייל של הלקוח לוחצים על "שליחה ל־QR", או גוררים את הקבצים לכאן.'],
      drop: ['בחירת קבצים', 'אפשר גם לבחור קבצים או תיקייה מהמחשב.'],
      import: ['קריאת הקבצים', 'QR קורא את כל הקבצים לבד. בסיום הוא עובר בעצמו לשלב הבא.'],
      groups: ['קבוצות החלקים', 'החלקים מחולקים לפי צבע: שלנו, לבדיקה, ולא שלנו. לוחצים על חלק כדי לפתוח אותו.'],
      drawing: ['השרטוט', 'גוררים כדי להזיז וגוללים כדי להגדיל. כך רואים כל פרט.'],
      card: ['כרטיס החלק', 'כאן מופיעים החומר, הטיפול התרמי, הציפויים, הצבע והמיסוך. הסדר הוא סדר העבודה.'],
      flags: ['מה לעשות עם החלק', 'סימון אדום דורש תשומת לב. מאשרים, שואלים את הלקוח, או מעלים מסמך חסר.'],
      docs: ['מסמכים ושאלות', 'כאן רואים אילו מסמכים חסרים ואילו שאלות יישלחו ללקוח.'],
      summary: ['סיכום', 'מכאן מוציאים את השאלות, את הגיליון ואת הדוח.'],
      tabs: ['כמה בקשות יחד', 'כל בקשה נפתחת בלשונית משלה. לוחצים על + כדי לפתוח עוד אחת.'],
      history: ['היסטוריה', 'כאן נמצאות הבקשות האחרונות. לחיצה אחת פותחת אותן בדיוק במקום שעזבתם.'],
      assistant: ['העוזר', 'העוזר נותן רמזים קצרים בכל שלב. לחיצה עליו מכבה או מדליקה אותו.'],
      settings: ['הגדרות', 'כאן בוחרים שפה, גודל טקסט, לקוחות וחומרים.'],
    } },
  ru: { dir: 'ltr', name: 'Русский',
    ui: { tipDrag: 'Перетащите, чтобы переместить; двойной щелчок - вернуть на место', back: 'Назад', next: 'Далее', skip: 'Пропустить', done: 'Готово', of: 'из', lang: 'Язык обучения', tipBack: 'Предыдущая карточка', tipNext: 'Следующая карточка', tipSkip: 'Закрыть обучение', tipDot: 'Перейти к карточке', watch: '\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0432\u0438\u0434\u0435\u043e', tipWatch: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0435 \u0432\u0438\u0434\u0435\u043e', noVideo: '\u0412\u0438\u0434\u0435\u043e \u043d\u0430 \u044d\u0442\u043e\u043c \u044f\u0437\u044b\u043a\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442' },
    demo: { send: 'Отправить в QR', drop: 'Перетащите файлы сюда', importing: 'Читаю файлы…', ours: 'Наше', check: 'Проверить', notOurs: 'Не наше', confirm: 'Подтвердить', ask: 'Вопрос', upload: 'Загрузить', q: 'Вопросы', x: 'Таблица', pdf: 'Отчёт', tab: 'Запрос' },
    s: {
      outlook: ['Начните с письма', 'В письме клиента нажмите «Отправить в QR» или перетащите файлы сюда.'],
      drop: ['Выбор файлов', 'Можно также выбрать файлы или папку на компьютере.'],
      import: ['Чтение файлов', 'QR сам читает все файлы. Потом он сам переходит к следующему шагу.'],
      groups: ['Группы деталей', 'Детали разделены по цвету: наше, проверить и не наше. Нажмите на деталь, чтобы открыть её.'],
      drawing: ['Чертёж', 'Тяните, чтобы сдвинуть, и крутите колесо, чтобы увеличить.'],
      card: ['Карточка детали', 'Здесь материал, термообработка, покрытия, краска и маскировка. Порядок — как в работе.'],
      flags: ['Что делать с деталью', 'Красная пометка требует внимания. Подтвердите, задайте вопрос клиенту или загрузите документ.'],
      docs: ['Документы и вопросы', 'Здесь видно, каких документов не хватает и какие вопросы уйдут клиенту.'],
      summary: ['Итог', 'Отсюда выгружаются вопросы, таблица и отчёт.'],
      tabs: ['Несколько запросов', 'Каждый запрос открывается в своей вкладке. Нажмите +, чтобы открыть ещё один.'],
      history: ['История', 'Здесь последние запросы. Один щелчок открывает их там, где вы остановились.'],
      assistant: ['Помощник', 'Помощник даёт короткие подсказки на каждом шаге. Щелчок по нему включает или выключает его.'],
      settings: ['Настройки', 'Здесь выбираются язык, размер текста, клиенты и материалы.'],
    } },
  en: { dir: 'ltr', name: 'English',
    ui: { tipDrag: 'Drag to move, double-click to reset position', back: 'Back', next: 'Next', skip: 'Skip', done: 'Done', of: 'of', lang: 'Tutorial language', tipBack: 'Previous card', tipNext: 'Next card', tipSkip: 'Close the tutorial', tipDot: 'Go to this card', watch: 'Watch video', tipWatch: 'Watch the tutorial video', noVideo: 'No video in this language yet' },
    demo: { send: 'Send to QR', drop: 'Drop files here', importing: 'Reading the files…', ours: 'Ours', check: 'To check', notOurs: 'Not ours', confirm: 'Confirm', ask: 'Question', upload: 'Upload', q: 'Questions', x: 'Sheet', pdf: 'Report', tab: 'Request' },
    s: {
      outlook: ['Start from the email', "In the customer's email, click \"Send to QR\", or drop the files here."],
      drop: ['Choose files', 'You can also pick files or a folder from your computer.'],
      import: ['Reading the files', 'QR reads all the files by itself. When done, it moves to the next step on its own.'],
      groups: ['Part groups', 'Parts are sorted by color: ours, to check, and not ours. Click a part to open it.'],
      drawing: ['The drawing', 'Drag to move and scroll to zoom. You can see every detail.'],
      card: ['The part card', 'It shows the material, heat treatment, coatings, paint and masking. They are listed in work order.'],
      flags: ['What to do with a part', 'Red marks need attention. Confirm, ask the customer, or upload a missing document.'],
      docs: ['Documents and questions', 'See which documents are missing and which questions go to the customer.'],
      summary: ['Summary', 'Export the questions, the sheet and the report from here.'],
      tabs: ['Several requests', 'Each request opens in its own tab. Click + to open another one.'],
      history: ['History', 'Your recent requests are here. One click reopens them where you left off.'],
      assistant: ['The assistant', 'The assistant gives short hints at every step. Click it to turn it on or off.'],
      settings: ['Settings', 'Choose the language, text size, customers and materials here.'],
    } },
};

/** Cards for a wizard step (stage > 0), or the whole tour (stage 0 / undefined). */
export function tourFor(stage) { return stage ? TOUR.filter((s) => s.stage === stage) : TOUR.slice(); }
export function tourLang(l) { return TOUR_TEXT[l] ? l : 'he'; }
