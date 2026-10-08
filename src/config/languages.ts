import type { LanguageCode } from '../types';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇮🇳',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
  },
];

export const DICTIONARY: Record<LanguageCode, Record<string, string>> = {
  en: {
    heroTitle: 'Government services. Without the unnecessary queue.',
    heroSub: 'Find the service you need, know the documents required, get your virtual token, and reach the office at the right time.',
    findService: 'Find a Service',
    getStarted: 'Get Started',
    login: 'Login',
    activeQueue: 'Active Queue',
    tokenNumber: 'Token Number',
    currentServing: 'Now Serving',
    peopleAhead: 'People Ahead',
    estimatedWait: 'Estimated Wait',
    askAI: 'Ask AI Assistant',
    applyService: 'Apply for Service',
    documentsRequired: 'Required Documents',
  },
  gu: {
    heroTitle: 'સરકારી સેવાઓ. અનાવશ્યક લાઈન વગર.',
    heroSub: 'તમને જોઈતી સેવા શોધો, જરૂરી દસ્તાવેજો જાણો, વર્ચ્યુઅલ ટોકન મેળવો અને યોગ્ય સમયે કચેરી પહોંચો.',
    findService: 'સેવા શોધો',
    getStarted: 'શરૂ કરો',
    login: 'લોગિન',
    activeQueue: 'સક્રિય લાઈન',
    tokenNumber: 'ટોકન નંબર',
    currentServing: 'હાલની લાઈન',
    peopleAhead: 'આગળના લોકો',
    estimatedWait: 'અંદાજિત સમય',
    askAI: 'AI સહાયકને પૂછો',
    applyService: 'અરજી કરો',
    documentsRequired: 'જરૂરી દસ્તાવેજો',
  },
  hi: {
    heroTitle: 'सरकारी सेवाएं। बिना लंबी कतार के।',
    heroSub: 'अपनी आवश्यक सेवा खोजें, आवश्यक दस्तावेज़ जानें, वर्चुअल टोकन प्राप्त करें और सही समय पर कार्यालय पहुंचे।',
    findService: 'सेवा खोजें',
    getStarted: 'शुरू करें',
    login: 'लॉगिन',
    activeQueue: 'सक्रिय कतार',
    tokenNumber: 'टोकन संख्या',
    currentServing: 'वर्तमान टोकन',
    peopleAhead: 'आगे के लोग',
    estimatedWait: 'अनुमानित समय',
    askAI: 'AI सहायक से पूछें',
    applyService: 'आवेदन करें',
    documentsRequired: 'आवश्यक दस्तावेज़',
  },
};
