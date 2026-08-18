import { ENV } from "../_core/env";

/**
 * Não expõe a credencial: apenas informa se o servidor recebeu uma senha ROOT
 * válida para o bootstrap inicial da conta administrativa.
 */
export function hasRootBootstrapSecret() {
  return ENV.rootInitialPassword.trim().length >= 8;
}

/** Promove somente a identidade do proprietário configurada pelo ambiente a ROOT. */
export function isConfiguredRootIdentity(openId: string, ownerOpenId = ENV.ownerOpenId) {
  const configuredOwner = ownerOpenId.trim();
  return configuredOwner.length > 0 && openId === configuredOwner;
}
