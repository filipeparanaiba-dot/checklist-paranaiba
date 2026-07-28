import { DATA_SCHEMA_VERSION, createInitialWorkspace } from "./core.js";

const DB_NAME = "super-checklist-paranaiba-demo";
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current";
const DB_VERSION = 1;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
  });
}

export async function openWorkspaceDatabase() {
  if (!("indexedDB" in globalThis)) {
    throw new Error("Este navegador não oferece armazenamento local compatível.");
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  });

  return requestToPromise(request);
}

export async function loadWorkspace() {
  const database = await openWorkspaceDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const transactionDone = transactionToPromise(transaction);
    const stored = await requestToPromise(
      transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY),
    );
    await transactionDone;

    if (!stored || stored.schemaVersion !== DATA_SCHEMA_VERSION) {
      const workspace = createInitialWorkspace();
      await saveWorkspace(workspace);
      return workspace;
    }

    return stored;
  } finally {
    database.close();
  }
}

export async function saveWorkspace(workspace) {
  const database = await openWorkspaceDatabase();
  try {
    const snapshot = {
      ...workspace,
      schemaVersion: DATA_SCHEMA_VERSION,
      mode: "demo-local",
      updatedAt: new Date().toISOString(),
    };
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const transactionDone = transactionToPromise(transaction);
    transaction.objectStore(STORE_NAME).put(snapshot, WORKSPACE_KEY);
    await transactionDone;
    return snapshot;
  } finally {
    database.close();
  }
}

export async function resetWorkspace() {
  const workspace = createInitialWorkspace();
  return saveWorkspace(workspace);
}

export function downloadWorkspaceBackup(workspace) {
  const payload = JSON.stringify(workspace, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `checklist-paranaiba-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function parseWorkspaceBackup(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (
    !parsed ||
    parsed.schemaVersion !== DATA_SCHEMA_VERSION ||
    !Array.isArray(parsed.audits) ||
    !Array.isArray(parsed.actions)
  ) {
    throw new Error("O arquivo não é um backup compatível.");
  }
  return parsed;
}
