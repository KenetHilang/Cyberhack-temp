export type ActionState = { ok: boolean; error?: string; message?: string };

export const initial: ActionState = { ok: false };
