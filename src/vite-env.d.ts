/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare function gtag(command: 'config', targetId: string, config?: Record<string, unknown>): void;
declare function gtag(command: 'event', eventName: string, eventParams?: Record<string, unknown>): void;
declare function gtag(command: 'consent', action: string, params: Record<string, string>): void;
declare function gtag(command: 'js', date: Date): void;
