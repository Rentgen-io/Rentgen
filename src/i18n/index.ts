import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import hi from './locales/hi';
import id from './locales/id';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import lt from './locales/lt';
import nl from './locales/nl';
import pl from './locales/pl';
import ptBR from './locales/pt-BR';
import ru from './locales/ru';
import th from './locales/th';
import tr from './locales/tr';
import uk from './locales/uk';
import vi from './locales/vi';
import zhCN from './locales/zh-CN';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lt: { translation: lt },
    pl: { translation: pl },
    uk: { translation: uk },
    es: { translation: es },
    de: { translation: de },
    'pt-BR': { translation: ptBR },
    'zh-CN': { translation: zhCN },
    fr: { translation: fr },
    th: { translation: th },
    ja: { translation: ja },
    ko: { translation: ko },
    it: { translation: it },
    tr: { translation: tr },
    id: { translation: id },
    vi: { translation: vi },
    hi: { translation: hi },
    nl: { translation: nl },
    ru: { translation: ru },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
