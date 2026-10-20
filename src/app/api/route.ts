import { NextResponse } from "next/server";

;

export async function GET() {
  return NextResponse.json({ message: "УшиХвост API работает" });
}
export const dynamic = "force-static"
