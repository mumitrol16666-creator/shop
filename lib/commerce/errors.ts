import type { CommerceErrorCode, CommerceErrorShape } from "./types";

export class CommerceDomainError extends Error {
  readonly code: CommerceErrorCode;
  readonly recoverable: boolean;
  readonly field?: string;
  readonly lineId?: string;
  readonly details?: Record<string, unknown>;

  constructor(error: CommerceErrorShape) {
    super(error.message);
    this.name = "CommerceDomainError";
    this.code = error.code;
    this.recoverable = error.recoverable;
    this.field = error.field;
    this.lineId = error.lineId;
    this.details = error.details;
  }

  toJSON(): CommerceErrorShape {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      ...(this.field ? { field: this.field } : {}),
      ...(this.lineId ? { lineId: this.lineId } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export const commerceError = (
  code: CommerceErrorCode,
  message: string,
  options: Omit<CommerceErrorShape, "code" | "message">,
) => new CommerceDomainError({ code, message, ...options });

export const toErrorResponse = (error: unknown): { error: CommerceErrorShape } => {
  if (error instanceof CommerceDomainError) return { error: error.toJSON() };
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "Не удалось выполнить операцию магазина.",
      recoverable: true,
    },
  };
};
