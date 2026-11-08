/**
 * Judarn Design System Tailwind Preset & Plugin
 */
declare const judarnTailwindPlugin: {
  (options?: any): any;
  theme: {
    extend: Record<string, any>;
  };
};

export = judarnTailwindPlugin;
