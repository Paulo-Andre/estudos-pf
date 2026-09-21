export type BackupUserRow = {
  id: number;
  openId: string;
  name: string;
  username: string | null;
  email: string | null;
  cpf: string | null;
  loginMethod: string;
  role: "user" | "admin";
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type AdminBackupData = Record<string, unknown[]> & { users: BackupUserRow[] };

export function serializeAdminBackup(data: AdminBackupData, generatedAt = new Date()) {
  const tableCounts = Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length]));
  return {
    format: "nucleo-concursos-logical-backup",
    version: 1,
    generatedAt: generatedAt.toISOString(),
    restoreNotes: [
      "Esta exportação contém dados pedagógicos, comerciais e de progresso.",
      "Hashes de senha, tokens, cookies e sessões ativas foram excluídos deliberadamente.",
      "A restauração deve ser feita de forma controlada em uma base vazia ou após cópia de segurança da base de destino.",
    ],
    excludedTables: ["authSessions"],
    tableCounts,
    data,
  };
}
