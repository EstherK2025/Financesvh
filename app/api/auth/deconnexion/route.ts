import { NextResponse } from "next/server";
import { fermerSession } from "@/lib/fin-auth";

export async function POST() {
  await fermerSession();
  return NextResponse.json({ ok: true });
}
