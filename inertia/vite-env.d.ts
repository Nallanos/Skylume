/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
    glob: (pattern: string, options?: { eager?: boolean }) => Record<string, any>
}
