import type { App } from 'obsidian';
import en from './en.json';
import type { Locale } from './types';
import zh from './zh.json';

type TranslationKeys = typeof en;

class I18nManager {
  private locale: Locale = 'en';
  private translations: Record<Locale, TranslationKeys> = { en, zh };

  init(app: App): void {
    let obsidianLocale = 'en';

    // 方法1: 通过 vault.config (Obsidian 1.4+)
    if (app.vault && 'config' in app.vault) {
      const vaultWithConfig = app.vault as Record<string, unknown>;
      const config = vaultWithConfig.config as Record<string, unknown> | undefined;
      if (config && typeof config.locale === 'string') {
        obsidianLocale = config.locale;
      }
    }

    // 方法2: 通过 localStorage 备用
    if (obsidianLocale === 'en') {
      try {
        const savedLocale = localStorage.getItem('obsidian-locale');
        if (savedLocale) {
          obsidianLocale = savedLocale;
        }
      } catch (_e) {
        // localStorage 可能不可用
      }
    }

    // 方法3: 通过 navigator.language 最终备用
    if (obsidianLocale === 'en') {
      obsidianLocale = navigator.language || 'en';
    }

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
