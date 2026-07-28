export type UserRole = "operator" | "manager" | "admin";
export type QuestionKind = "boolean" | "number" | "text" | "choice";
export type AssignmentState = "assigned" | "in_progress" | "submitted" | "revoked";
export type DeliveryState = "draft" | "pending" | "sending" | "acknowledged" | "blocked";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeIds: string[];
}

export interface OperatorQuestion {
  id: string;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  unit?: string;
  options?: string[];
  help?: string;
}

export interface OperatorAssignment {
  id: string;
  storeId: string;
  storeName: string;
  sector: string;
  dueAt: string;
  state: AssignmentState;
  templateId: string;
  templateVersionId: string;
  templateName: string;
  templateVersion: number;
  estimatedMinutes: number;
  questions: OperatorQuestion[];
}

export interface DraftAnswer {
  questionId: string;
  value: string | number | boolean | null;
  observedAt: string;
}

export interface ExecutionSubmission {
  executionId: string;
  assignmentId: string;
  templateVersionId: string;
  deviceId: string;
  startedAt: string;
  completedAt: string;
  answers: DraftAnswer[];
}

export interface SyncOperation {
  operationId: string;
  idempotencyKey: string;
  kind: "submit_execution";
  createdAt: string;
  attempts: number;
  state: Exclude<DeliveryState, "draft">;
  payload: ExecutionSubmission;
  lastError?: string;
}

export interface SyncReceipt {
  operationId: string;
  executionId: string;
  protocol: string;
  receivedAt: string;
}

export interface ManagerExecutionSummary {
  id: string;
  assignmentId: string;
  operatorName: string;
  storeName: string;
  templateName: string;
  submittedAt: string;
  score: number;
  conformCount: number;
  nonconformCount: number;
  actionPlanCount: number;
}

export interface ManagerDashboard {
  openAssignments: number;
  pendingSync: number;
  submittedToday: number;
  openActionPlans: number;
  recentExecutions: ManagerExecutionSummary[];
}

export interface ApiErrorBody {
  error: string;
  message: string;
  requestId: string;
  details?: unknown;
}
