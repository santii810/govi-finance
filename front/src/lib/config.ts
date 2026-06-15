export const TABLES = {
  users: "mwspabgn3fdm9ot",
  gastos: "myqcksevgehcvlp",
  ingresos: "mrr99jc3e3707n6",
  inversiones: "mwnd0d416iwzwv6",
  patrimonio: "mimdsus64el2tnl",
  automaticActions: "mugm6tw1ail68rq",
  importRules: "mo7uf7o396lxp59",
} as const;

export function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return sessionSecret;
}

export function getNocoDbConfig() {
  const nocodbUrl = process.env.NOCODB_URL ?? "http://localhost:23456";
  const nocodbToken = process.env.NOCODB_API_TOKEN ?? "";

  if (!nocodbToken) {
    throw new Error("NOCODB_API_TOKEN is required");
  }

  return { nocodbUrl, nocodbToken };
}

export function getAppConfig() {
  return {
    ...getNocoDbConfig(),
    sessionSecret: getSessionSecret(),
    timezone: process.env.TIMEZONE ?? "Europe/Madrid",
  };
}

export function getBackupConfig() {
  const backupUrl = (process.env.BACKUP_MANAGER_URL ?? "http://backup-manager:8090").replace(
    /\/$/,
    "",
  );
  const triggerSecret = process.env.BACKUP_TRIGGER_SECRET ?? "";
  if (!triggerSecret) {
    throw new Error("BACKUP_TRIGGER_SECRET is required");
  }
  return { backupUrl, triggerSecret };
}
