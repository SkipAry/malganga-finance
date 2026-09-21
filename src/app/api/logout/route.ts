import { NextResponse } from "next/server";

import { destroySession } from "@/lib/session";

/** POST-only so a stray link prefetch cannot sign the user out. */
export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
