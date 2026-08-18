import { ENV } from "../_core/env";

/**
 * Não expõe a credencial: apenas informa se o servidor recebeu uma senha ROOT
 * válida para o bootstrap inicial da conta administrativa.
 */
export function hasRootBootstrapSecret() {
  return ENV.rootInitialPassword.trim().length >= 8;
}
