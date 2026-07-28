import { Preferences } from "@capacitor/preferences";
import type { DraftAnswer, OperatorAssignment, SyncOperation, SyncReceipt } from "@checklist/contracts";

export interface LocalState {
  deviceId: string;
  lastAuthenticatedAt?: string;
  assignments: OperatorAssignment[];
  drafts: Record<string, DraftAnswer[]>;
  startedAt: Record<string, string>;
  outbox: SyncOperation[];
  receipts: SyncReceipt[];
}

const storageKey = "operator-state-v1";

function createState(): LocalState {
  return {
    deviceId: crypto.randomUUID(),
    assignments: [],
    drafts: {},
    startedAt: {},
    outbox: [],
    receipts: [],
  };
}

export async function loadState(): Promise<LocalState> {
  const { value } = await Preferences.get({ key: storageKey });
  if (!value) {
    const initial = createState();
    await saveState(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(value) as Partial<LocalState>;
    return {
      ...createState(),
      ...parsed,
      drafts: parsed.drafts ?? {},
      startedAt: parsed.startedAt ?? {},
      outbox: parsed.outbox ?? [],
      receipts: parsed.receipts ?? [],
      assignments: parsed.assignments ?? [],
    };
  } catch {
    const recovered = createState();
    await saveState(recovered);
    return recovered;
  }
}

export async function saveState(state: LocalState) {
  await Preferences.set({ key: storageKey, value: JSON.stringify(state) });
}
