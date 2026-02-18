import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Famiglia Budget API",
    version: "1.0.0"
  });
}
