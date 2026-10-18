import "server-only";
import { proofHandlers } from "@/server/proof/runtime";

export const runtime = "nodejs";
export const POST = proofHandlers.credential;
