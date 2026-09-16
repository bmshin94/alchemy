export const SOCKET_USER_ENTRY = "user-entry";
export const SERVICE_USER_WORKER = "user-worker";

/**
 * Default date shared by deployed Workers, framework runners, previews, and
 * internal isolates.
 */
export const DEFAULT_COMPATIBILITY_DATE = "2026-08-31";

/** Default JavaScript Workers to the URL-based registry, honoring explicit opt-outs. */
export const withDefaultFlags = (flags: Array<string>): Array<string> =>
  flags.includes("new_module_registry") ||
  flags.includes("legacy_module_registry") ||
  flags.includes("python_workers")
    ? flags
    : [...flags, "new_module_registry"];

export const defaultDurableObjectUniqueKey = (
  scriptName: string,
  className: string,
) => `${encodeURIComponent(scriptName)}-${encodeURIComponent(className)}`;
