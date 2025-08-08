declare global {
  interface Window {
    __TAURI__: {
      core: {
        invoke: (cmd: string, args?: Record<string, any>) => Promise<any>;
      };
    };
  }
}

export interface TauriGreetResponse {
  message: string;
}

export {};