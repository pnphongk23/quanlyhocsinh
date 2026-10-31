/** Replace the lazy loader in the owning role routes when adding a feature. */
export function placeholderRoute(title: string) {
  return async () => {
    const { default: Page } = await import("./Placeholder");
    return { Component: () => <Page title={title} /> };
  };
}
