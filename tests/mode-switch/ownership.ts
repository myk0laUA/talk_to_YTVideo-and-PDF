// Synthetic cross-factory accounting, excluded from production.
export const chronology: object[] = [];
let sequence = 0;
const owners = new Set<number>(), connections = new Set<object>();
const untransferred = new Set<object>();
let maxOwners = 0, maxTransferred = 0, maxUntransferred = 0;
export function acquired(connection: object) {
  untransferred.add(connection); maxUntransferred = Math.max(maxUntransferred, untransferred.size);
  chronology.push({ event: "adapter-acquired", untransferred: untransferred.size });
}
const identities = new WeakMap<object, number>(), controllers = new WeakSet<object>();
let identityReused = false, controllerReused = false;
export function identityObserved(owner: number, identity?: object) {
  if (!identity) return;
  const earlier = identities.get(identity);
  if (earlier !== undefined && earlier !== owner) identityReused = true;
  if (earlier === undefined) { identities.set(identity, owner); chronology.push({ event: "new-identity", owner, ...identity }); }
}
export function controllerCreated(controller: object) {
  if (controllers.has(controller)) controllerReused = true;
  controllers.add(controller);
}
export function ownerCreated(mode: string) {
  const owner = ++sequence; owners.add(owner); maxOwners = Math.max(maxOwners, owners.size);
  chronology.push({ event: "mount", mode, owner, liveOwners: owners.size }); return owner;
}
export function ownerDisposed(owner: number) {
  owners.delete(owner); chronology.push({ event: "dispose", owner, liveOwners: owners.size });
}
export function transferred(connection: object) {
  untransferred.delete(connection);
  connections.add(connection); maxTransferred = Math.max(maxTransferred, connections.size);
  chronology.push({ event: "transfer", liveTransferred: connections.size });
}
export function released(connection: object) {
  connections.delete(connection); untransferred.delete(connection); chronology.push({ event: "release", liveTransferred: connections.size, untransferred: untransferred.size });
}
export const ownership = () => ({ maxOwners, maxTransferred, maxUntransferred, untransferred: untransferred.size, owners: owners.size, transferred: connections.size, identityReused, controllerReused, chronology });
