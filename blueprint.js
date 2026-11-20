// מבנה המערכת: התזרים שלנו. תזרים ביתי שמתעדכן במשפט אחד.
window.BLUEPRINT = {
  id: 'hatazrim-shelanu',
  name: 'התזרים שלנו',
  purpose: 'כותבים במשפט קצר מה קנינו וכמה עלה, ופעם בחודש מעלים את דף העו״ש ואת פירוט כאל. האפליקציה מסדרת הכל לתזרים, ומראה כמה נשאר החודש, איפה הכסף בורח ואיך מתקדמים ליעדים.',
  owner: 'פנחס',
  style: 'clean-pro',
  styleOptions: ['clean-pro', 'soft-air', 'bold-dark'],
  styleAccents: { 'clean-pro': '#0D1F5E', 'soft-air': '#5B5BD6', 'bold-dark': '#D2AB62' },
  brand: { accent: '#0D1F5E', logo: '' },
  homeView: 'home',
  nav: [
    { href: '#/', icon: 'home', label: 'בית', key: 'home' },
    { href: '#/t/tx', icon: 'list', label: 'תנועות', key: 'tx' },
    { href: '#/x/insights', icon: 'chart', label: 'תובנות', key: 'insights' },
    { href: '#/t/goals', icon: 'star', label: 'יעדים', key: 'goals' },
    { href: '#/x/more', icon: 'wallet', label: 'עוד', key: 'more' }
  ],

  roles: [
    { id: 'owner', label: 'פנחס', can: 'רואה ועורך הכל' },
    { id: 'member', label: 'בלומי', can: 'רואה ועורכת הכל, מהטלפון שלה' }
  ],

  tables: [
    {
      id: 'tx', label: 'תנועות', item: 'תנועה', gender: 'f', icon: 'list',
      title: 'desc', subtitle: 'category', status: 'kind', date: 'date', money: 'amount',
      fields: [
        { id: 'desc', label: 'מה', type: 'text', required: true },
        { id: 'amount', label: 'סכום', type: 'money', required: true },
        { id: 'kind', label: 'סוג', type: 'status', options: [
          { v: 'הוצאה', color: 'orange', done: true },
          { v: 'הכנסה', color: 'green', done: true },
          { v: 'העברה', color: 'gray', done: true }
        ] },
        { id: 'category', label: 'קטגוריה', type: 'relation', table: 'cats' },
        { id: 'date', label: 'תאריך', type: 'date', required: true },
        { id: 'who', label: 'מי', type: 'select', options: ['פנחס', 'בלומי'] },
        { id: 'source', label: 'מאיפה הגיע', type: 'select', options: ['צ׳אט', 'עו״ש לאומי', 'אשראי כאל', 'Claude', 'GPT', 'ידני'] },
        { id: 'fixed', label: 'הוצאה קבועה', type: 'checkbox' },
        { id: 'waste', label: 'סימנתי כמיותרת', type: 'checkbox' },
        { id: 'notes', label: 'הערות', type: 'longtext' }
      ]
    },
    {
      id: 'fixed', label: 'קבועים', item: 'קבוע', gender: 'm', icon: 'calendar',
      title: 'name', subtitle: 'category', status: 'type', money: 'amount',
      fields: [
        { id: 'name', label: 'שם', type: 'text', required: true },
        { id: 'type', label: 'סוג', type: 'status', options: [
          { v: 'הוצאה קבועה', color: 'orange', done: true },
          { v: 'הכנסה קבועה', color: 'green', done: true },
          { v: 'הופסק', color: 'gray', done: true }
        ] },
        { id: 'amount', label: 'סכום בחודש', type: 'money', required: true },
        { id: 'category', label: 'קטגוריה', type: 'relation', table: 'cats' },
        { id: 'day', label: 'יום בחודש', type: 'number' },
        { id: 'pay', label: 'איך משולם', type: 'select', options: ['עו״ש', 'אשראי כאל', 'מזומן'] },
        { id: 'match', label: 'איך זה כתוב בדף הבנק', type: 'text' }
      ]
    },
    {
      id: 'cats', label: 'קטגוריות', item: 'קטגוריה', gender: 'f', icon: 'box', keepOnClear: true,
      title: 'name', subtitle: 'type', money: 'budget',
      fields: [
        { id: 'name', label: 'שם', type: 'text', required: true },
        { id: 'type', label: 'סוג', type: 'select', options: ['חובה', 'רצון', 'הכנסה'] },
        { id: 'budget', label: 'תקציב בחודש', type: 'money' },
        { id: 'words', label: 'מילים שמזהות אותה', type: 'longtext' }
      ]
    },
    {
      id: 'goals', label: 'יעדים', item: 'יעד', gender: 'm', icon: 'star',
      title: 'name', subtitle: 'deadline', status: 'status', date: 'deadline', money: 'target',
      fields: [
        { id: 'name', label: 'היעד', type: 'text', required: true },
        { id: 'target', label: 'כמה צריך', type: 'money', required: true },
        { id: 'saved', label: 'כמה כבר יש', type: 'money' },
        { id: 'monthly', label: 'הפקדה בחודש', type: 'money' },
        { id: 'deadline', label: 'עד מתי', type: 'date' },
        { id: 'status', label: 'מצב', type: 'status', options: [
          { v: 'בדרך', color: 'yellow' },
          { v: 'הושג', color: 'green', done: true },
          { v: 'מושהה', color: 'gray', done: true }
        ] }
      ]
    }
  ],

  dashboard: {
    kpis: [
      { label: 'הוצאות החודש', table: 'tx', sum: 'amount', where: { kind: 'הוצאה' }, period: 'month' },
      { label: 'הכנסות החודש', table: 'tx', sum: 'amount', where: { kind: 'הכנסה' }, period: 'month' }
    ]
  },

  automations: [
    { label: 'כותבים "שופרסל 340" בצ׳אט, והאפליקציה מבינה לבד את הסכום, הקטגוריה ומי כתב', status: 'פעיל' },
    { label: 'מעלים את קובץ העו״ש של לאומי ואת הפירוט של כאל, וכל התנועות נכנסות ומסווגות. בלי כפילויות', status: 'פעיל' },
    { label: 'האפליקציה לומדת: כשמתקנים קטגוריה פעם אחת, היא זוכרת את בית העסק', status: 'פעיל' },
    { label: 'מזהה מנויים, עמלות בנק, חריגות מהתקציב והוצאות שחוזרות', status: 'פעיל' },
    { label: 'מציעה תקציב לכל קטגוריה לפי הממוצע שלכם', status: 'פעיל' },
    { label: 'כתיבה דרך Claude ודרך GPT, ישר לאותו תזרים', status: 'בהמשך' },
    { label: 'עובד משני הטלפונים, שלך ושל בלומי, עם אותם נתונים', status: 'פעיל' }
  ],

  publicForms: [],

  samples: {
    cats: [
      { id: 'c-food', name: 'סופר ומזון', type: 'חובה', words: 'שופרסל, רמי לוי, יוחננוף, ויקטורי, אושר עד, יש חסד, מחסני השוק, חצי חינם, מכולת, ירקות, פירות, סופר, מאפייה, קצביה, עוף' },
      { id: 'c-home', name: 'שכר דירה או משכנתא', type: 'חובה', words: 'שכר דירה, שכירות, משכנתא, משכנתה' },
      { id: 'c-util', name: 'חשמל, מים וארנונה', type: 'חובה', words: 'חשמל, חברת החשמל, מים, תאגיד, ארנונה, עירייה, גז, ועד בית' },
      { id: 'c-kids', name: 'ילדים וחינוך', type: 'חובה', words: 'גן, צהרון, מעון, תלמוד תורה, ת"ת, ישיבה, סמינר, שכר לימוד, חוג, בייביסיטר, חיתולים, טיטולים, מטרנה' },
      { id: 'c-car', name: 'רכב ותחבורה', type: 'חובה', words: 'דלק, פז, סונול, דור אלון, דלק, ten, חניה, פנגו, סלופארק, רב קו, אוטובוס, רכבת, מונית, גט, מוסך, טסט, צמיגים' },
      { id: 'c-health', name: 'ביטוחים ובריאות', type: 'חובה', words: 'ביטוח, הראל, מגדל, כלל, הפניקס, מנורה, מכבי, כללית, מאוחדת, לאומית, תרופות, סופר פארם, בית מרקחת, רופא, שיניים' },
      { id: 'c-comm', name: 'תקשורת ומנויים', type: 'רצון', words: 'פלאפון, סלקום, פרטנר, גולן, הוט, בזק, yes, אינטרנט, נטפליקס, ספוטיפיי, גוגל, אפל, icloud, מנוי' },
      { id: 'c-shabbat', name: 'שבת וחגים', type: 'חובה', words: 'שבת, חג, פסח, סוכות, ארבעת המינים, אתרוג, יין, חלות, נרות, מצות, משלוח מנות, פורים' },
      { id: 'c-cloth', name: 'ביגוד ובית', type: 'רצון', words: 'בגדים, נעליים, ביגוד, איקאה, ace, הום סנטר, כלי בית, רהיטים, מצעים, h&m, זארה, קסטרו, פוקס' },
      { id: 'c-fun', name: 'מסעדות ובילויים', type: 'רצון', words: 'מסעדה, פיצה, שווארמה, פלאפל, המבורגר, קפה, קפה קפה, ארומה, וולט, wolt, תן ביס, 10ביס, בילוי, טיול, נופש, צימר, סרט, גלידה' },
      { id: 'c-tzedaka', name: 'צדקה ומעשרות', type: 'חובה', words: 'צדקה, מעשר, מעשרות, תרומה, קופת העיר, קופה, גמ"ח, הוראת קבע צדקה' },
      { id: 'c-loans', name: 'הלוואות וחובות', type: 'חובה', words: 'הלוואה, החזר הלוואה, ריבית, גמח, פריסה' },
      { id: 'c-misc', name: 'שונות', type: 'רצון', words: '' },
      { id: 'c-income', name: 'הכנסות', type: 'הכנסה', words: 'משכורת, שכר, הכנסה, קיבלתי, העברה מ, ביט מ, מענק, קצבה, קצבת ילדים, ביטוח לאומי, החזר מס, תשלום מלקוח' }
    ],
    tx: [
      { id: 't1', desc: 'שופרסל', amount: 412, kind: 'הוצאה', category: 'c-food', date: 'today', who: 'בלומי', source: 'צ׳אט' },
      { id: 't2', desc: 'דלק', amount: 250, kind: 'הוצאה', category: 'c-car', date: '-1d', who: 'פנחס', source: 'צ׳אט' },
      { id: 't3', desc: 'פיצה לארוחת ערב', amount: 118, kind: 'הוצאה', category: 'c-fun', date: '-2d', who: 'פנחס', source: 'צ׳אט', waste: true },
      { id: 't4', desc: 'צהרון', amount: 650, kind: 'הוצאה', category: 'c-kids', date: '-4d', who: 'בלומי', source: 'עו״ש לאומי', fixed: true },
      { id: 't5', desc: 'יין וחלות לשבת', amount: 96, kind: 'הוצאה', category: 'c-shabbat', date: '-5d', who: 'בלומי', source: 'צ׳אט' },
      { id: 't6', desc: 'נטפליקס', amount: 55, kind: 'הוצאה', category: 'c-comm', date: '-6d', who: 'פנחס', source: 'אשראי כאל', fixed: true },
      { id: 't7', desc: 'משכורת', amount: 9800, kind: 'הכנסה', category: 'c-income', date: '-8d', who: 'פנחס', source: 'צ׳אט' },
      { id: 't8', desc: 'רמי לוי', amount: 687, kind: 'הוצאה', category: 'c-food', date: '-9d', who: 'בלומי', source: 'אשראי כאל' },
      { id: 't9', desc: 'עמלת פעולה בסניף', amount: 12, kind: 'הוצאה', category: 'c-misc', date: '-10d', who: 'פנחס', source: 'עו״ש לאומי' }
    ],
    fixed: [
      { id: 'f1', name: 'משכורת', type: 'הכנסה קבועה', amount: 9800, category: 'c-income', day: 10, pay: 'עו״ש', match: 'משכורת' },
      { id: 'f2', name: 'משכורת אשתי', type: 'הכנסה קבועה', amount: 6200, category: 'c-income', day: 1, pay: 'עו״ש', match: 'משכורת' },
      { id: 'f3', name: 'שכר דירה', type: 'הוצאה קבועה', amount: 4800, category: 'c-home', day: 1, pay: 'עו״ש', match: 'שכר דירה' },
      { id: 'f4', name: 'ארנונה', type: 'הוצאה קבועה', amount: 520, category: 'c-util', day: 15, pay: 'אשראי כאל', match: 'עיריית' },
      { id: 'f5', name: 'צהרון', type: 'הוצאה קבועה', amount: 650, category: 'c-kids', day: 5, pay: 'עו״ש', match: 'צהרון' },
      { id: 'f6', name: 'ביטוח בריאות', type: 'הוצאה קבועה', amount: 310, category: 'c-health', day: 2, pay: 'אשראי כאל', match: 'ביטוח' },
      { id: 'f7', name: 'נטפליקס', type: 'הוצאה קבועה', amount: 55, category: 'c-comm', day: 12, pay: 'אשראי כאל', match: 'netflix' },
      { id: 'f8', name: 'מעשרות', type: 'הוצאה קבועה', amount: 1600, category: 'c-tzedaka', day: 1, pay: 'עו״ש', match: 'מעשר' }
    ],
    goals: [
      { id: 'g1', name: 'קרן חירום: 3 חודשי מחיה', target: 45000, saved: 12000, monthly: 1500, deadline: '+540d', status: 'בדרך' },
      { id: 'g2', name: 'חופשה משפחתית בקיץ', target: 8000, saved: 2600, monthly: 900, deadline: '+210d', status: 'בדרך' },
      { id: 'g3', name: 'סגירת המינוס', target: 5000, saved: 5000, monthly: 0, deadline: '-20d', status: 'הושג' }
    ]
  }
};
