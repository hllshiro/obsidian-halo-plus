import { type App, getLanguage } from 'obsidian';
import en from './en.json';
import type { Locale } from './types';
import zh from './zh.json';

type TranslationKeys = typeof en;

class I18nManager {
  private locale: Locale = 'en';
  private translations: Record<Locale, TranslationKeys> = { en, zh };

  init(_app: App): void {
    const obsidianLocale = getLanguage() || 'en';
    this.locale = obsidianLocale.startsWith('zh') ? 'zh' : 'en';
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let value: unknown = this.translations[this.locale];

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    if (typeof value !== 'string') {
      return key; // 回退到键名
    }

    // 替换参数
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => params[paramKey] || '');
    }

    return value;
  }

  getLocale(): Locale {
    return this.locale;
  }
}

export const i18n = new I18nManager();
export const t = (key: string, params?: Record<string, string>) => i18n.t(key, params);
