export const storefrontPreviewMessageType = "nucleo-storefront-preview";

export function isStorefrontPreviewMode(search: string) {
  return new URLSearchParams(search).get("preview") === "storefront";
}

export function isTrustedStorefrontPreviewMessage(origin: string, expectedOrigin: string, type: unknown) {
  return origin === expectedOrigin && type === storefrontPreviewMessageType;
}
