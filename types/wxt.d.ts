/**
 * WXT Framework の型定義
 */

interface ContentScriptContext {
  matches: string[];
  main(): void;
}

declare function defineContentScript(context: ContentScriptContext): any;

// WXTのグローバル型定義
declare global {
  const defineContentScript: typeof defineContentScript;
}

export {};