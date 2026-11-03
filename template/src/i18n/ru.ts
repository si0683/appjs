// Русский — базовый язык. Остальные языки повторяют эту структуру ключей.
const ru = {
  tabs: { home: 'Главная', notes: 'Заметки', feed: 'Лента', settings: 'Настройки' },
  home: {
    hello: 'Привет!',
    helloName: 'Привет, {{name}}!',
    lead: 'Это стартовое приложение AppJS. Меняйте экраны в src/app — изменения видны сразу на телефоне.',
    stackTitle: 'Что уже подключено',
    stack: {
      router: 'Экраны и навигация по файлам',
      ui: 'Готовые компоненты в стиле shadcn',
      data: 'Загрузка данных с кэшем и обновлением',
      db: 'Локальная база SQLite на устройстве',
      forms: 'Формы с проверкой полей',
      i18n: 'Перевод на несколько языков',
    },
    toast: 'Показать уведомление',
    toastText: 'Всё работает',
    signIn: 'Войти',
  },
  notes: {
    empty: 'Заметок пока нет',
    emptyHint: 'Нажмите «Добавить» — заметка сохранится в базе на телефоне.',
    add: 'Добавить',
    newTitle: 'Новая заметка',
    title: 'Заголовок',
    body: 'Текст',
    save: 'Сохранить',
    saved: 'Заметка сохранена',
    cancel: 'Отмена',
    done: 'Готово',
    delete: 'Удалить',
    deleteAsk: 'Удалить заметку?',
    deleteHint: 'Это действие нельзя отменить.',
    count_one: '{{count}} заметка',
    count_few: '{{count}} заметки',
    count_many: '{{count}} заметок',
    count_other: '{{count}} заметки',
    notFound: 'Заметка не найдена',
  },
  feed: {
    error: 'Не удалось загрузить',
    retry: 'Повторить',
    likes: 'нравится: {{count}}',
  },
  settings: {
    theme: 'Тема',
    themeSystem: 'Как в системе',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    language: 'Язык',
    haptics: 'Вибрация при нажатии',
    account: 'Аккаунт',
    signedInAs: 'Вы вошли как {{email}}',
    guest: 'Вы не вошли',
    signIn: 'Войти',
    signOut: 'Выйти',
    version: 'Версия {{version}}',
  },
  auth: {
    title: 'Вход',
    lead: 'Демо-вход: подойдёт любая почта и пароль от 6 символов.',
    email: 'Почта',
    password: 'Пароль',
    submit: 'Войти',
    welcome: 'Добро пожаловать!',
  },
  validation: {
    required: 'Заполните поле',
    email: 'Неверная почта',
    min: 'Минимум {{count}} символов',
    max: 'Максимум {{count}} символов',
  },
  notFound: { title: 'Такого экрана нет', back: 'На главную' },
};

export default ru;

// Тип словаря: TypeScript подскажет ключи в t('...') и найдёт опечатки.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof ru>;
