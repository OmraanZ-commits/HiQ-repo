// ─── Compatibility shim ───────────────────────────────────────────────────────
// All amendment types are now unified as Service Requests in sr-store.ts.
// This file re-exports the relevant symbols under their old names.

export type { SrType as AmendmentType } from "./sr-store";
export type { ServiceRequest as AmendmentRequest } from "./sr-store";
export { SR_TYPE_META as AMENDMENT_TYPE_META } from "./sr-store";
export { addRequest as addAmendment, approveStep as approveAmendmentStep, rejectStep as rejectAmendmentStep } from "./sr-store";
export { useSrStore as useAmendmentStore } from "./sr-store";
export { getRequests as getAmendments } from "./sr-store";
