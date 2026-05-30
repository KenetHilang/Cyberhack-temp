// Thrown when a business rule blocks an operation (distinct from an auth error).
// Carries a human-readable reason that is surfaced directly in the UI — this is
// how the platform demonstrates *system-enforced* policy.
export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}
