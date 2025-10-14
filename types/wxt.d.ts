/**
 * WXT Framework の型定義
 */

interface ContentScriptContext {
  matches: string[];
  main(): void;
}

interface BackgroundContext {
  (): void;
}

declare function defineContentScript(context: ContentScriptContext): any;
declare function defineBackground(context: BackgroundContext): any;

// WXTのグローバル型定義
declare global {
  const defineContentScript: typeof defineContentScript;
  const defineBackground: typeof defineBackground;
}

export {};