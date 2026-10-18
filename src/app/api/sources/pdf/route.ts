import "server-only";
import { sourceHandlers } from "@/server/sources/runtime";

export const runtime = "nodejs";
export const POST = sourceHandlers.upload;
