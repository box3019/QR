/** Tutorial text. One language per view, never mixed. Keep the three languages in the same order and count. */
export type TLang = 'he' | 'ru' | 'en';
export const TUT: Record<TLang, { dir: 'rtl' | 'ltr'; name: string; ui: { tipDrag: string; title: string; prev: string; next: string; done: string; step: string; lang: string; tipPrev: string; tipNext: string; tipDone: string; tipLang: string }; steps: { h: string; p: string }[] }> = {
  he: {
    dir: 'rtl', name: 'עברית',
    ui: { tipDrag: 'גררו להזזה, לחיצה כפולה לאיפוס המיקום', title: 'מדריך QR', prev: 'הקודם', next: 'הבא', done: 'סיום', step: 'שלב', lang: 'שפת המדריך', tipPrev: 'לשלב הקודם', tipNext: 'לשלב הבא', tipDone: 'סגירת המדריך', tipLang: 'בחירת שפת המדריך' },
    steps: [
      { h: 'מה QR עושה', p: 'QR קורא שרטוטים של לקוח, רשימות חלקים ומודלים, ומכין מסמכים חסרים ושאלות ללקוח. אין מחירים ואין ERP. העבודה מתקדמת בארבעה שלבים שמופיעים למעלה.' },
      { h: 'שלב 1: קליטה', p: 'גררו לחלון את המייל של הלקוח, ארכיון ZIP/RAR או שרטוטים, או לחצו "בחירת קבצים". בסיום QR עובר לבד לשלב הבא.' },
      { h: 'שלב 2: בדיקת חלקים', p: 'החלקים מקובצים לפי מצב: מתאים לנו, חסר מסמך, ממתין לתשובת לקוח, לא החומר או התהליך שלנו. לחצו על חלק כדי לראות את השרטוט שלו.' },
      { h: 'שלב 3: מסמכים ושאלות', p: 'לכל חלק מוצגים המסמכים שצריך להעלות והשאלות ללקוח. "צירוף מסמך…" מצרף קובץ. לחיצה על שאלה מציגה את המקום שלה בשרטוט.' },
      { h: 'שלב 4: סיכום', p: '"ייצוא שאלות" מכין מכתב ללקוח בעברית או באנגלית. "ייצוא לאקסל" שומר את כל הדרישות. "הצגת דוח" פותח טבלה של כל החלקים.' },
      { h: 'מעבר בין שלבים ופרטים', p: 'אפשר ללחוץ ישירות על כל שלב בפס העליון. "פרטים" מציג מידע טכני נוסף, ו"הגדרות" מכיל שפה, גודל טקסט, חומרים, תהליכים ולקוחות.' },
    ],
  },
  ru: {
    dir: 'ltr', name: 'Русский',
    ui: { tipDrag: 'Перетащите, чтобы переместить; двойной щелчок - вернуть на место', title: 'Руководство QR', prev: 'Назад', next: 'Далее', done: 'Готово', step: 'Шаг', lang: 'Язык руководства', tipPrev: 'Предыдущий шаг', tipNext: 'Следующий шаг', tipDone: 'Закрыть руководство', tipLang: 'Выбор языка руководства' },
    steps: [
      { h: 'Что делает QR', p: 'QR читает чертежи заказчика, спецификации и модели и готовит недостающие документы и вопросы заказчику. Без цен и без ERP. Работа идёт в четыре шага, показанных сверху.' },
      { h: 'Шаг 1: Приём', p: 'Перетащите в окно письмо заказчика, архив ZIP/RAR или чертежи, или нажмите «Выбрать файлы». После обработки QR сам перейдёт к следующему шагу.' },
      { h: 'Шаг 2: Проверка деталей', p: 'Детали сгруппированы по статусу: подходит нам, нужен документ, ждёт ответа заказчика, не наш материал или процесс. Нажмите на деталь, чтобы увидеть её чертёж.' },
      { h: 'Шаг 3: Документы и вопросы', p: 'Для каждой детали показаны документы для загрузки и вопросы заказчику. «Прикрепить документ…» добавляет файл. Нажатие на вопрос показывает его место на чертеже.' },
      { h: 'Шаг 4: Итог', p: '«Выгрузить вопросы» готовит письмо заказчику на иврите или английском. «Выгрузить в Excel» сохраняет все требования. «Показать отчёт» открывает таблицу всех деталей.' },
      { h: 'Переход между шагами и подробности', p: 'На любой шаг можно нажать прямо в верхней панели. «Подробности» показывает техническую информацию, а в «Настройках» есть язык, размер текста, материалы, процессы и заказчики.' },
    ],
  },
  en: {
    dir: 'ltr', name: 'English',
    ui: { tipDrag: 'Drag to move, double-click to reset position', title: 'QR tutorial', prev: 'Back', next: 'Next', done: 'Done', step: 'Step', lang: 'Tutorial language', tipPrev: 'Previous step', tipNext: 'Next step', tipDone: 'Close the tutorial', tipLang: 'Choose the tutorial language' },
    steps: [
      { h: 'What QR does', p: 'QR reads customer drawings, parts lists and models, and prepares missing documents and customer questions. No prices, no ERP. The work goes in four steps shown at the top.' },
      { h: 'Step 1: Intake', p: 'Drop the customer email, a ZIP/RAR archive or drawings onto the window, or click "Choose files". When it is done, QR moves to the next step by itself.' },
      { h: 'Step 2: Check parts', p: 'Parts are grouped by status: fits us, needs document, needs customer answer, not our material or process. Click a part to see its drawing.' },
      { h: 'Step 3: Documents & questions', p: 'Each part shows the documents to upload and the questions for the customer. "Attach document…" adds a file. Clicking a question shows where it is on the drawing.' },
      { h: 'Step 4: Summary', p: '"Export questions" builds a customer letter in Hebrew or English. "Export Excel" saves all requirements. "Show report" opens a table of all parts.' },
      { h: 'Moving between steps, and details', p: 'Click any step in the top bar to go straight to it. "Details" shows extra technical information, and "Settings" holds language, text size, materials, processes and customers.' },
    ],
  },
};
