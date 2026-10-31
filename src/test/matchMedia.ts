export function installMatchMedia(): void {
  if (typeof window === "undefined" || (window as any).matchMedia) return;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (media: string): MediaQueryList => ({
      matches: false, media, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  });
}
