import "server-only";
import { sourceHandlers } from "@/server/sources/runtime";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return sourceHandlers.read(request, (await context.params).id);
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return sourceHandlers.remove(request, (await context.params).id);
}
