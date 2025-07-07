// Global type declarations for the project

// Bootstrap module declarations
declare module '../tests/bootstrap.js' {
  export const runnerHooks: Record<string, any>;
  interface BootstrapConfig {
    [key: string]: any;
  }
  const config: BootstrapConfig;
  export default config;
}
