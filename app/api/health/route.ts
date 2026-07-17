import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ db: "ok" });
  } catch (e) {
    return NextResponse.json({ db: "erreur", message: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
