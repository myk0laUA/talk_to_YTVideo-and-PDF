import "server-only";
import { textHandlers } from "@/server/text/runtime";
import { textMethodNotAllowed } from "@/server/text/handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return textHandlers.stream(request, (await context.params).id);
}
export const HEAD = textMethodNotAllowed;
export const POST = textMethodNotAllowed;
export const PUT = textMethodNotAllowed;
export const PATCH = textMethodNotAllowed;
export const DELETE = textMethodNotAllowed;
export const OPTIONS = textMethodNotAllowed;
