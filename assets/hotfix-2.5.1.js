// PC Simulator v2.5.1 compatibility hotfix.
// v2.5 migrated memory state from a single `ram` value to the `rams` collection,
// but one compatibility expression still referenced the removed global identifier.
// Exposing this truthy compatibility shim prevents that stale reference from
// interrupting rendering until the expression is removed from app-simulator.js.
window.ram = true;
