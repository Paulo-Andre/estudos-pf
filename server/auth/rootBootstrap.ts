import { ENV } from "../_core/env";
import {
  convertUserToLocalRoot,
  createLocalUser,
  getUserByOpenId,
  getUserByUsername,
  updateUserRole,
} from "../db";
import { hashPassword } from "./localAuth";
import { hasRootBootstrapSecret } from "./rootConfig";

/**
 * Garante uma única conta ROOT local. A identidade OWNER_OPEN_ID é consultada
 * somente durante a migração do registro antigo; nenhum login OAuth é aceito.
 */
export async function ensureRootAccount() {
  if (!hasRootBootstrapSecret()) return;

  const existingLocal = await getUserByUsername("paulo");
  if (existingLocal) {
    if (existingLocal.role !== "admin") await updateUserRole(existingLocal.id, "admin");
    if (existingLocal.loginMethod !== "local" || existingLocal.openId !== "local:paulo" || !existingLocal.passwordHash) {
      await convertUserToLocalRoot(existingLocal.id, await hashPassword(ENV.rootInitialPassword));
    }
    return;
  }

  // Migração única: reaproveita o mesmo userId da antiga conta proprietária,
  // evitando criar um segundo usuário e perder o histórico associado.
  const ownerOpenId = ENV.ownerOpenId.trim();
  if (ownerOpenId) {
    const existingOwner = await getUserByOpenId(ownerOpenId);
    if (existingOwner) {
      await convertUserToLocalRoot(existingOwner.id, await hashPassword(ENV.rootInitialPassword));
      return;
    }
  }

  const passwordHash = await hashPassword(ENV.rootInitialPassword);
  await createLocalUser({
    name: "Paulo André",
    username: "paulo",
    email: null,
    passwordHash,
    role: "admin",
  });
}
