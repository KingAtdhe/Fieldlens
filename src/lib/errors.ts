import type { ErrorResponse } from "@shared/schema";

export class ApiError extends Error {
  code: ErrorResponse["error"]["code"] | "network" | "timeout" | "not_configured";
  constructor(code: ApiError["code"], message: string) {
    super(message);
    this.code = code;
  }
}
