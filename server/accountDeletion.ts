export type AccountDeletionTarget = {
  name: string;
  username: string | null;
};

function normalizeConfirmation(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
}

/** Aceita o nome atual ou o usuário atual, sem depender de capitalização. A conta sempre é localizada pelo id. */
export function matchesAccountDeletionConfirmation(target: AccountDeletionTarget, confirmation: string) {
  const candidate = normalizeConfirmation(confirmation);
  return [target.name, target.username]
    .filter((value): value is string => Boolean(value))
    .some(value => normalizeConfirmation(value) === candidate);
}
