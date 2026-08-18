import { ENV } from "../_core/env";
import { createLocalUser, getUserByUsername, updateUserRole } from "../db";
import { hashPassword } from "./localAuth";
import { hasRootBootstrapSecret } from "./rootConfig";

/** Cria a credencial ROOT apenas se ela ainda não existir; nunca regrava a senha já definida. */
export async function ensureRootAccount() {
  if (!hasRootBootstrapSecret()) return;

  const existing = await getUserByUsername("paulo");
  if (existing) {
    if (existing.role !== "admin") await updateUserRole(existing.id, "admin");
    return;
  }

  const passwordHash = await hashPassword(ENV.rootInitialPassword);
  await createLocalUser({
    name: "Administrador ROOT",
    username: "paulo",
    email: null,
    passwordHash,
    role: "admin",
  });
}
