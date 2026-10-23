// Test-only read access via React's DevTools integration. Production code exposes
// no new global or diagnostics UI. Only the existing safe projections leave here.
export function observeVoiceDiagnostics() {
  let controller;
  const visit = fiber => {
    if (!fiber) return;
    const candidate = fiber.stateNode?.controller;
    if (candidate && 'eventDiagnostics' in candidate) controller = candidate;
    visit(fiber.child); visit(fiber.sibling);
  };
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, inject: () => 1,
    onCommitFiberRoot(_id, root) { controller = undefined; visit(root.current); },
    onCommitFiberUnmount() {},
  };
  globalThis.__voice13dDiagnostics = () => {
    if (!controller) throw new Error('Test observer did not find the mounted voice controller');
    return { setup: controller.snapshot.diagnostics, chronology: controller.eventDiagnostics };
  };
}
