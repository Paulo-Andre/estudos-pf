type RootAccessFailure = {
  message?: string;
  data?: { code?: string };
};

/** Converte erros técnicos de autenticação em uma instrução acionável para o ROOT. */
export function rootAccessMessage(error: unknown) {
  const failure = (error ?? {}) as RootAccessFailure;
  const message = failure.message ?? "";

  if (
    failure.data?.code === "UNAUTHORIZED" ||
    message.includes("required permission (10002)") ||
    message.includes("sessão ROOT não está ativa")
  ) {
    return "Sua sessão ROOT não está ativa. Toque em Sair e entre novamente com o usuário paulo antes de enviar a capa.";
  }

  return message || "Não foi possível concluir esta ação. Tente novamente.";
}
