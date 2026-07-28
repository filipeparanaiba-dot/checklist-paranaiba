import type {
  AuthenticatedUser,
  ExecutionSubmission,
  OperatorAssignment,
  SyncReceipt,
} from "@checklist/contracts";

const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8095").replace(/\/+$/, "");

export class ApiClient {
  private accessToken = "";

  async developmentLogin(email: string): Promise<AuthenticatedUser> {
    const response = await fetch(`${apiUrl}/v1/dev/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await response.json()) as {
      accessToken?: string;
      user?: AuthenticatedUser;
      message?: string;
    };
    if (!response.ok || !body.accessToken || !body.user) {
      throw new Error(body.message ?? "Não foi possível entrar.");
    }
    this.accessToken = body.accessToken;
    return body.user;
  }

  async assignments(): Promise<OperatorAssignment[]> {
    const body = await this.request<{ assignments: OperatorAssignment[] }>("/v1/operator/assignments");
    return body.assignments;
  }

  async submit(payload: ExecutionSubmission, idempotencyKey: string): Promise<SyncReceipt> {
    const body = await this.request<{ receipt: SyncReceipt }>("/v1/operator/executions", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    });
    return body.receipt;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.accessToken) throw new Error("Sua sessão terminou. Entre novamente.");
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...init.headers,
      },
    });
    const body = (await response.json()) as T & { message?: string };
    if (!response.ok) throw new Error(body.message ?? "Não foi possível concluir a operação.");
    return body;
  }
}
