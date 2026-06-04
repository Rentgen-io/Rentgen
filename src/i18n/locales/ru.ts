const ru = {
  // Common
  common: {
    send: 'Отправить',
    save: 'Сохранить',
    saved: 'Сохранено ✅',
    cancel: 'Отмена',
    close: 'Закрыть',
    ok: 'OK',
    create: 'Создать',
    delete: 'Удалить',
    import: 'Импорт',
    export: 'Экспорт',
    copy: 'Копировать',
    copied: 'Скопировано ✅',
    run: 'Запустить',
    replace: 'Заменить',
    merge: 'Объединить',
    overwrite: 'Перезаписать',
    enabled: 'Включено',
    disabled: 'Отключено',
    warning: 'Предупреждение:',
    connect: 'Подключиться',
    disconnect: 'Отключиться',
    beautify: 'Форматировать',
    reload: 'Перезагрузить',
    cut: 'Вырезать',
    paste: 'Вставить',
  },

  // Sidebar
  sidebar: {
    collections: 'Коллекции',
    environments: 'Окружения',
    history: 'История',
    settings: 'Настройки',
    checkForUpdates: 'Проверить обновления',
    reportFeedback: 'Оставить отзыв',
  },

  // Collections Panel
  collections: {
    newFolder: 'Новая папка',
    importCollection: 'Импортировать коллекцию',
    exportCollection: 'Экспортировать коллекцию',
    searchCollections: 'Поиск по коллекциям...',
    noMatchingRequests: 'Нет подходящих запросов',
    noSavedRequests: 'Нет сохраненных запросов',
    importFailed: 'Ошибка импорта: {{error}}',
    exportFailed: 'Ошибка экспорта: {{error}}',
    importedWithWarnings: 'Импортировано с предупреждениями: {{count}}',
    collectionImported: 'Коллекция импортирована',
    collectionExported: 'Коллекция экспортирована',
  },

  // Environment
  environment: {
    newEnvironment: 'Новое окружение',
    editEnvironment: 'Редактировать окружение',
    noEnvironmentsCreated: 'Окружения не созданы',
    environmentName: 'Название окружения',
    environmentNamePlaceholder: 'например, Production, Staging, Local',
    color: 'Цвет',
    variables: 'Переменные',
    variableName: 'Имя переменной',
    addVariable: 'Добавить переменную',
    value: 'Значение',
    refreshValue: 'Обновить значение',
    refreshAll: 'Обновить все',
    noEnvironment: 'Без окружения',
    selectEnvironment: 'Выбрать окружение',
    randomEmail: 'Случайный email',
    randomInteger: 'Случайное целое число',
    randomString: 'Случайная строка',
    deleteEnvironmentConfirm: 'Вы уверены, что хотите удалить это окружение?',
    deleteEnvironment: 'Удалить окружение',
    untitled: 'Без названия',
  },

  // History
  history: {
    title: 'История',
    clearAll: 'Очистить все',
    searchHistory: 'Поиск по истории...',
    noMatchingHistory: 'Нет совпадений в истории',
    noHistoryYet: 'История пока пуста',
    today: 'Сегодня',
    yesterday: 'Вчера',
  },

  // Request
  request: {
    enterUrl: 'Введите URL или вставьте текст',
    headers: 'Заголовки',
    headersPlaceholder: 'Header-Key: value',
    body: 'Тело',
    bodyPlaceholderHttp: 'Введите тело запроса (JSON или Form Data)',
    bodyPlaceholderWss: 'Тело сообщения',
    protobufSchema: 'Схема Protobuf и тип сообщения',
    protobufDescription: 'Экспериментальный и необязательный раздел. Если используется, оба поля должны быть заполнены',
    messageTypePlaceholder: 'Тип сообщения (например, mypackage.MyMessage)',
    protoSchemaLoaded: '🟢 Схема proto загружена',
    protoSchemaParseFailed: '🔴 Не удалось разобрать proto: ',
    wssUrlRequired: '🔴 Используйте URL с ws:// или wss://',
    modePlaceholder: 'MODE',
    methodPlaceholder: 'METHOD',
  },

  // Response
  response: {
    title: 'Ответ',
    sending: 'Отправка...',
    networkError: 'Ошибка сети',
  },

  // cURL
  curl: {
    importCurl: 'Импортировать cURL',
    importCurlPlaceholder: 'Введите cURL или вставьте текст',
    invalidCurl: 'Похоже, что указанная команда cURL недействительна. Проверьте ее и попробуйте снова',
    copyCurl: 'Скопировать cURL',
  },

  // Tests
  tests: {
    generateAndRun: 'Сгенерировать и запустить тесты',
    runningTests: 'Выполняются тесты... ({{current}}/{{total}})',
    selectForCompare: 'Выбрать для сравнения',
    compareWithSelected: 'Сравнить с выбранным',
    exportFormat: 'Формат',
    exported: 'Экспортировано ✅',
    generateCertificate: 'Создать сертификат',
    certificated: 'Сертификат создан ✅',
    notEligible: 'Недоступно (нужно не менее 70 тестов)',
    securityTests: 'Тесты безопасности',
    performanceInsights: 'Анализ производительности',
    dataDrivenTests: 'Тесты на основе данных',
    crud: 'CRUD',
    runningSecurityTests: 'Выполняются тесты безопасности...',
    runningPerformanceInsights: 'Выполняется анализ производительности...',
    runningDataDrivenTests: 'Выполняются тесты на основе данных...',
    preparingCrud: 'Подготовка CRUD…',
    crudDescription: 'CRUD генерируются на основе ответа теста обработки метода OPTIONS в разделе тестов безопасности.',
    crudNote: 'Примечание:',
    crudNoteText: 'Если тест обработки метода OPTIONS отключен, CRUD не будут сгенерированы.',
    copyBugReport: 'Скопировать отчет об ошибке',
    computingDifferences: 'Вычисление различий…',
    bodyParameters: 'Параметры тела',
    queryParameters: 'Параметры запроса',
    formatPlaceholder: 'Формат',
  },

  // Comparison Panel
  comparison: {
    title: 'Сравнение результатов тестов',
    noTestResults: 'Нет результатов тестов для сравнения',
    potentialBugs: 'Возможные ошибки',
    fullBehaviorChanges: 'Полные изменения поведения',
    noPotentialBugs: 'Потенциальные ошибки не обнаружены ✅',
    showFullBehaviorChanges: 'Показать полные изменения поведения',
    behaviorChange: 'Изменение поведения:',
    showNoise: 'Показать шум',
  },

  // Modals
  modals: {
    reload: {
      title: 'Перезагрузка',
      description: 'Будут потеряны только результаты текущих тестов',
      confirmText: 'Перезагрузить',
    },
    sendHttpSuccess: {
      title: 'Запрос выглядит корректно!',
      description:
        'Теперь у Rentgen есть корректный запрос для работы. Перед генерацией тестов быстро проверьте сопоставленные поля, чтобы убедиться, что все выглядит правильно',
      confirmText: 'Проверить и сгенерировать тесты',
      doNotShowAgain: 'Больше не показывать',
    },
    deleteFolder: {
      title: 'Удалить папку',
      description: 'Эта папка содержит запросы. Вы уверены, что хотите ее удалить?',
    },
    importConflict: {
      title: 'Обнаружены конфликты импорта',
      conflictDescription: 'Импортируемая коллекция "{{name}}" конфликтует с вашей существующей коллекцией:',
      collectionNamesMatch: 'Названия коллекций совпадают',
      folderConflicts: '{{count}} папок с совпадающими именами',
      requestConflicts: '{{count}} запросов с совпадающими URL+Method или именем',
      importWarnings: 'Предупреждения импорта: {{count}}',
      replaceDescription: 'Полностью заменить существующую коллекцию ({{folders}} папок, {{requests}} запросов)',
      mergeDescription: 'Добавить только уникальные элементы (дубликаты по URL+Method или имени будут пропущены)',
      newFolders: '{{count}} новых папок',
      newRequests: '{{count}} новых запросов',
      noNewItems: 'Нет новых элементов для добавления',
      importAsCopy: 'Импортировать как копию',
      copyDescription: 'Добавить все папки с суффиксом "(copy)" ({{folders}} папок, {{requests}} запросов)',
    },
    setDynamicVariable: {
      title: 'Назначить как динамическую переменную',
      editTitle: 'Редактировать динамическую переменную',
      variableName: 'Имя переменной',
      variableNamePlaceholder: 'variable_name',
      preview: 'Предпросмотр:',
      environment: 'Окружение',
      allEnvironments: 'Все окружения',
      untitledEnvironment: 'Окружение без названия',
      selectEnvironment: 'Выберите окружение...',
      linkedRequest: 'Связанный запрос',
      variableNameRequired: 'Имя переменной обязательно',
      selectorRequired: 'Селектор обязателен',
      selectEnvironmentError: 'Пожалуйста, выберите окружение',
      duplicateWarning: 'Переменная с таким именем уже существует. Она будет перезаписана.',
      saveVariable: 'Сохранить переменную',
      updateVariable: 'Обновить переменную',
    },
    projectImport: {
      title: 'Импорт проекта',
      file: 'Файл',
      exported: 'Экспортировано',
      appVersion: 'Версия приложения',
      integrity: 'Целостность',
      integrityWarning:
        'Проверка целостности файла не пройдена. Возможно, файл был изменен вне Rentgen. Продолжайте с осторожностью.',
      overwriteWarning: 'Это перезапишет ВСЕ ваши текущие данные:',
      collectionsCount: 'Коллекции ({{folders}} папок, {{requests}} запросов)',
      environmentsCount: 'Окружения ({{count}} окружений)',
      dynamicVariablesCount: 'Динамические переменные ({{count}} переменных)',
      historyCount: 'История ({{count}} записей)',
      settingsInfo: 'Настройки (тема, движок тестов, настройки истории)',
      cannotBeUndone: 'Это действие нельзя отменить.',
      backupBefore: 'Сделайте резервную копию текущего проекта перед импортом:',
      exportedCheck: 'Экспортировано ✓',
      exportCurrentProject: 'Экспортировать текущий проект',
      importProject: 'Импортировать проект',
    },
  },

  // Settings
  settings: {
    testEngine: 'Движок тестов',
    general: 'Общие',
    themes: 'Темы',
    language: 'Язык',
    themesDescription: 'Настройте внешний вид приложения под свой стиль.',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    cli: {
      name: 'CLI',
      intro:
        'CLI Rentgen запускает папку запросов из экспорта проекта <c>.rentgen</c> прямо из терминала — для CI-пайплайнов и скриптовых smoke-тестов. Он читает тот же файл, который создается через <e>Общие → Экспорт проекта</e>, и никогда не записывает изменения обратно.',
      fullDocumentation: 'Полная документация:',
      installInPath: 'Установить в PATH оболочки ({{platform}})',
      checkingStatus: 'Проверка статуса установки…',
      runCli: 'Запустить CLI',
      runCliDescription:
        'Rentgen предоставляет единственную подкоманду <c>xray</c> (псевдоним: <c>run</c>). Укажите файл проекта, экспортированный из приложения.',
      exportProject: 'Экспорт проекта',
      noProjectFileYet:
        'У вас еще нет файла проекта? Экспортируйте его сейчас — это то же действие, что и <e>Общие → Экспорт проекта</e>.',
      developmentNote: 'Во время разработки запускайте напрямую из репозитория: <c>npm run dev:cli -- xray …</c>.',
      options: 'Опции',
      examples: 'Примеры',
      exampleInteractive: 'Интерактивно выберите папку и окружение:',
      exampleCi: 'Скриптовый запуск в CI с явным указанием папки и окружения и немедленной остановкой при ошибке:',
      exampleCiJson: 'Машиночитаемый вывод для CI-пайплайнов (GitHub Actions, Jenkins, Slack-нотификаторы):',
      exampleOverrideVars: 'Переопределение переменных в месте вызова (наивысший приоритет):',
      integrityCheck: 'Проверка целостности',
      integrityCheckDescription:
        'Каждый экспорт проекта содержит SHA-256 хеш своих данных. При загрузке CLI пересчитывает хеш. Если он совпадает, выполнение продолжается без сообщений. Если хеш отсутствует или файл был изменен, в TTY вы увидите запрос подтверждения, а в CI получите ошибку. Флаг <c>--skip-integrity-check</c> отключает эту проверку — используйте его, если вы осознанно редактировали файл вручную.',
      exitCodesTitle: 'Коды выхода',
      idempotency: 'Идемпотентность',
      idempotencyDescription:
        'CLI никогда не записывает изменения в файл проекта. Динамические переменные, извлеченные из ответов, хранятся в памяти в течение одного запуска, поэтому два последовательных запуска по неизмененному проекту создают побайтно идентичные URL, заголовки и тела запросов после подстановки значений.',
      platform: {
        macos: 'macOS',
        windows: 'Windows',
        linux: 'Linux',
      },
      status: {
        binaryUnavailable: 'CLI-бинарник недоступен',
        binaryUnavailableReinstall: 'Переустановите последнюю сборку Rentgen, чтобы включить CLI.',
        installed: 'Установлено',
        managedByPackageManager: ' (управляется менеджером пакетов)',
        conflictingPath: 'Конфликтующая команда `rentgen` в PATH',
        conflictingPathDescription:
          '<c>{{path}}</c> находится в PATH, но не указывает на эту установку Rentgen. Удалите ее, иначе установка отсюда будет перекрыта.',
        notInstalled: 'Не установлено',
        notInstalledDescription: 'Нажмите <e>Установить</e> ниже, чтобы добавить <c>rentgen</c> в PATH вашей оболочки.',
      },
      action: {
        working: 'Выполнение…',
        uninstall: 'Удалить CLI',
        reinstall: 'Переустановить',
        installRentgenInPath: 'Установить команду rentgen в PATH',
        packageManagerNote:
          'В Linux установка и удаление выполняются менеджером пакетов. Для удаления используйте <c>sudo apt remove rentgen</c> / <c>sudo dnf remove rentgen</c>.',
      },
      platformTip: {
        macos:
          'macOS запросит пароль для записи симлинка в <c>/usr/local/bin/rentgen</c>. После установки откройте новую вкладку Terminal, чтобы подхватить изменение.',
        windows:
          'Установка в Windows добавляет каталог ресурсов Rentgen в ваш <e>пользовательский</e> PATH (без прав администратора). Откройте новую вкладку PowerShell, Command Prompt или Windows Terminal после установки — текущие оболочки не увидят изменение.',
        linux:
          'В Linux postinstall-скрипт deb/rpm автоматически создает ссылку <c>/usr/bin/rentgen</c>. Если вы установили приложение из portable-архива, эта кнопка создаст пользовательский симлинк в <c>/usr/local/bin/rentgen</c> (или в <c>~/.local/bin/rentgen</c> как запасной вариант).',
      },
      flag: {
        collection: 'Папка для запуска из файла проекта. Если не указано, выбор будет интерактивным.',
        env: 'Окружение для использования. Передайте --env=none для запуска без окружения.',
        skipIntegrityCheck: 'Пропустить запрос подтверждения проверки целостности.',
        var: 'Переопределить переменную. Можно указывать несколько раз. Имеет наивысший приоритет над окружением и динамическими значениями.',
        timeout: 'Таймаут на запрос в миллисекундах. По умолчанию 30000.',
        failFast: 'Остановиться после первой ошибки.',
        report: 'Машиночитаемый вывод. Поддерживается: json (пишет JSON в stdout, подавляя человекочитаемый вывод).',
        noColor: 'Отключить цветной вывод.',
        verbose: 'Печатать полные сведения о запросе/ответе и предупреждать о неразрешенных переменных.',
      },
      exit: {
        code0: 'Все запросы выполнены успешно.',
        code1: 'Запуск завершился с ошибками, был прерван на запросе проверки целостности или остановлен через Ctrl+C.',
        code2:
          'Неверный ввод: отсутствует файл, некорректный JSON, неверная структура, неоднозначный или неизвестный --collection / --env, либо режим CI без обязательных флагов.',
      },
    },
    history: {
      title: 'История',
      description: 'Настройте сбор и хранение истории запросов.',
      enableHistory: 'Включить историю',
      maximumSize: 'Максимальный размер',
      retentionPeriod: 'Срок хранения',
      week1: '1 неделя',
      month1: '1 месяц',
      months3: '3 месяца',
      months6: '6 месяцев',
      year1: '1 год',
      noRetention: 'Без ограничения',
    },
    project: {
      title: 'Проект',
      description:
        'Экспортируйте или импортируйте весь проект, включая коллекции, окружения, переменные, историю и настройки.',
      exportProject: 'Экспортировать проект',
      importProject: 'Импортировать проект',
    },
    configuration: {
      title: 'Конфигурация',
      description: 'Настройте правила и ограничения для генерации случайных тестовых данных.',
      email: 'Email',
      domain: 'Домен',
      randomEmailLength: 'Длина случайного email',
      enum: 'Enum',
      enumDescription: 'Введите все допустимые значения, разделенные запятой',
      number: 'Число',
      minimumValue: 'Минимальное значение',
      maximumValue: 'Максимальное значение',
      string: 'Строка',
      minimumValueLength: 'Минимальная длина значения',
      maximumValueLength: 'Максимальная длина значения',
      randomInteger: 'Случайное целое число',
      randomString: 'Случайная строка',
      length: 'Длина',
    },
    securityTests: {
      title: 'Тесты безопасности',
      enabledCount: '{{enabled}}/{{total}} включено',
      description: 'Включайте и отключайте отдельные тесты безопасности, чтобы настроить работу под себя.',
    },
    performanceInsights: {
      title: 'Анализ производительности',
      enabledCount: '{{enabled}}/{{total}} включено',
      description:
        'Включайте и отключайте отдельные элементы анализа производительности, чтобы настроить работу под себя.',
    },
    languageSection: {
      title: 'Язык',
      description: 'Выберите предпочитаемый язык интерфейса приложения.',
      feedback:
        'Нашли проблему в переводе или хотите добавить другой язык? Создайте тикет со всеми деталями, и мы постараемся помочь.',
      feedbackLink: 'Открыть GitHub issue',
    },
  },

  // Controls
  controls: {
    sizeMB: 'Размер (МБ)',
    sizeMax: 'Размер (макс. {{max}} МБ)',
    threads: 'Потоки',
    threadsMax: 'Потоки (макс. 100)',
    requests: 'Запросы',
    requestsMax: 'Всего запросов (макс. 10 000)',
    mandatoryToggle: 'Включено = обязательно → Rentgen генерирует тесты на основе этой настройки',
    enumLabel: 'Введите все допустимые значения, разделенные запятой',
    numberLabel: 'Задайте диапазон Min/Max для граничного теста. 0 - целое, 0.00 - десятичное',
    stringLabel: 'Минимальная/максимальная длина значения',
    minPlaceholder: 'Мин',
    maxPlaceholder: 'Макс',
  },

  // Parameter types
  parameterTypes: {
    doNotTest: 'Не тестировать',
    randomEmail: 'Случайный email',
    randomInteger: 'Случайное целое число',
    randomString: 'Случайная строка',
    boolean: 'Boolean',
    currency: 'Валюта',
    dateYYYYMMDD: 'Дата (YYYY-MM-DD)',
    email: 'Email',
    enum: 'Enum',
    ipv4: 'IPv4',
    number: 'Число',
    numericString: 'Числовая строка',
    phone: 'Телефон',
    string: 'Строка',
    url: 'URL',
  },

  // Tables
  tables: {
    parameter: 'Параметр',
    value: 'Значение',
    check: 'Проверка',
    method: 'Метод',
    expected: 'Ожидаемое',
    actual: 'Фактическое',
    result: 'Результат',
    name: 'Имя',
    description: 'Описание',
    request: 'Запрос',
  },

  // Context Menu
  contextMenu: {
    setAsVariable: 'Назначить как переменную',
    saveRequestFirst: 'Сначала сохраните запрос в коллекцию',
    setAsDynamicVariableTitle: 'Назначить "{{path}}" как динамическую переменную',
  },

  // Badges
  badges: {
    verified: 'Проверено',
    modified: 'Изменено',
    noChecksum: 'Нет контрольной суммы',
  },

  // File input
  fileInput: {
    chooseFile: 'Выбрать файл',
    noFileChosen: 'Файл не выбран',
  },

  // Protobuf
  protobuf: {
    decodedProtobuf: 'Декодированный Protobuf:',
  },

  // Messages panel
  messages: {
    title: 'Сообщения',
  },

  // Export format labels
  exportFormats: {
    json: 'JSON (.json)',
    markdown: 'Markdown (.md)',
    csv: 'CSV (.csv)',
  },
};

export default ru;
