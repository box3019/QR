/** Tutorial text. One language per view, never mixed. Keep the three languages in the same order and count. */
export type TLang = 'he' | 'ru' | 'en';
export const TUT: Record<TLang, { dir: 'rtl' | 'ltr'; name: string; ui: { title: string; prev: string; next: string; done: string; step: string; lang: string; tipPrev: string; tipNext: string; tipDone: string; tipLang: string }; steps: { h: string; p: string }[] }> = {
  he: {
    dir: 'rtl', name: 'עברית',
    ui: { title: 'מדריך QR', prev: 'הקודם', next: 'הבא', done: 'סיום', step: 'שלב', lang: 'שפת המדריך', tipPrev: 'לשלב הקודם', tipNext: 'לשלב הבא', tipDone: 'סגירת המדריך', tipLang: 'בחירת שפת המדריך' },
    steps: [
      { h: 'מה QR עושה', p: 'QR קורא שרטוטים של לקוח, רשימות חלקים ומודלים, ובונה רשימת בעיות, שאלות ללקוח, מסמכים להעלאה ותצוגת כרטיס מסלול. אין מחירים ואין ERP.' },
      { h: 'הוספת קבצים', p: 'גררו קבצי PDF, רשימות חלקים, מודלי STEP, קבצי ZIP/RAR או מיילים לחלון, או לחצו "הוספת קבצים" / "הוספת תיקייה".' },
      { h: 'רשימת החלקים', p: 'בצד מוצג כל חלק עם התג שלו: מוכן, דורש תשומת לב, או חסום. לחצו על חלק כדי לראות את השרטוט, המסלול והנתונים שלו.' },
      { h: 'בעיות ומסמכים', p: 'בעיות מסודרות לפי חומרה. "נדרש מסמך" מסמן מפרט פנימי של הלקוח שצריך להעלות. השתמשו ב"צירוף מסמך…" כדי לצרף אותו.' },
      { h: 'כרטיס מסלול ותהליכים', p: 'בלשונית המסלול מוצגים שלבי העבודה. חלון התהליכים מציג ציפויים, צביעה, מיסוך וחומר מתוך הערות השרטוט, וניתן לייצא אותם לאקסל.' },
      { h: 'שאלות וסיכום', p: '"שאלות" בונה מכתב שאלות ללקוח בעברית או באנגלית. "סיכום" מציג את כל החלקים בטבלה אחת לייצוא.' },
      { h: 'פרטים והגדרות', p: '"פרטים" מציג מידע טכני נוסף. ב"הגדרות" בוחרים שפה, גודל טקסט, OCR, חומרים, תהליכים ולקוחות. כל כפתור מציג הסבר כשמעמידים עליו את העכבר.' },
    ],
  },
  ru: {
    dir: 'ltr', name: 'Русский',
    ui: { title: 'Руководство QR', prev: 'Назад', next: 'Далее', done: 'Готово', step: 'Шаг', lang: 'Язык руководства', tipPrev: 'Предыдущий шаг', tipNext: 'Следующий шаг', tipDone: 'Закрыть руководство', tipLang: 'Выбор языка руководства' },
    steps: [
      { h: 'Что делает QR', p: 'QR читает чертежи заказчика, спецификации и модели и составляет список проблем, вопросы заказчику, документы для загрузки и маршрутную карту. Без цен и без ERP.' },
      { h: 'Добавление файлов', p: 'Перетащите в окно PDF, спецификации, модели STEP, архивы ZIP/RAR или письма, или нажмите «Добавить файлы» / «Добавить папку».' },
      { h: 'Список деталей', p: 'Сбоку показана каждая деталь со своим статусом: готово, требует внимания или заблокировано. Нажмите на деталь, чтобы увидеть чертёж, маршрут и данные.' },
      { h: 'Проблемы и документы', p: 'Проблемы упорядочены по важности. «Нужен документ» означает внутреннюю спецификацию заказчика, которую надо загрузить. Используйте «Прикрепить документ…».' },
      { h: 'Маршрутная карта и процессы', p: 'На вкладке маршрута показаны этапы работы. Панель процессов показывает покрытия, окраску, маскирование и материал из примечаний чертежа и выгружает их в Excel.' },
      { h: 'Вопросы и сводка', p: '«Вопросы» составляет письмо заказчику на иврите или английском. «Сводка» показывает все детали в одной таблице для выгрузки.' },
      { h: 'Подробности и настройки', p: '«Подробности» показывает дополнительную техническую информацию. В «Настройках» выбираются язык, размер текста, OCR, материалы, процессы и заказчики. У каждой кнопки есть подсказка.' },
    ],
  },
  en: {
    dir: 'ltr', name: 'English',
    ui: { title: 'QR tutorial', prev: 'Back', next: 'Next', done: 'Done', step: 'Step', lang: 'Tutorial language', tipPrev: 'Previous step', tipNext: 'Next step', tipDone: 'Close the tutorial', tipLang: 'Choose the tutorial language' },
    steps: [
      { h: 'What QR does', p: 'QR reads customer drawings, parts lists and models, and builds a problems list, customer questions, documents to upload and a route-card preview. No prices, no ERP.' },
      { h: 'Adding files', p: 'Drag PDFs, parts lists, STEP models, ZIP/RAR archives or e-mails onto the window, or click "Add files" / "Add folder".' },
      { h: 'The parts list', p: 'Each part is listed with its status: ready, needs attention or blocked. Click a part to see its drawing, route and data.' },
      { h: 'Problems and documents', p: 'Problems are sorted by severity. "Document required" marks a customer-internal spec to upload. Use "Attach document…" to attach it.' },
      { h: 'Route card and processes', p: 'The Route tab shows the work steps. The Processes panel lists coatings, paint, masking and material from the drawing notes and exports them to Excel.' },
      { h: 'Questions and summary', p: '"Questions" builds a customer question letter in Hebrew or English. "Summary" shows all parts in one table for export.' },
      { h: 'Details and settings', p: '"Details" shows extra technical information. "Settings" holds language, text size, OCR, materials, processes and customers. Every button shows a tooltip on hover.' },
    ],
  },
};
