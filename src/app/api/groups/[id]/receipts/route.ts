import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { oneTimeExpenses, groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com";

console.log("OLLAMA_API_KEY present:", !!OLLAMA_API_KEY);
console.log("OLLAMA_BASE_URL:", OLLAMA_BASE_URL);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const expenseId = formData.get("expenseId") as string | null;

    if (!file || !expenseId) {
      return NextResponse.json({ error: "File and expenseId required" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo file non supportato" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File troppo grande (max 5MB)" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const [expense] = await db
      .select()
      .from(oneTimeExpenses)
      .where(and(eq(oneTimeExpenses.id, expenseId), eq(oneTimeExpenses.groupId, groupId)))
      .limit(1);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const imageUrl = `data:${file.type};base64,${base64Image}`;

    // OCR with Ollama only (Tesseract disabled for serverless)
    let receiptText = "";
    let ocrError = null;

    if (OLLAMA_API_KEY) {
      try {
        console.log("Calling Ollama Cloud API...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OLLAMA_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llava:7b",
            messages: [{
              role: "user",
              content: "Extract ALL text from this receipt. Return only the raw text.",
              images: [base64Image],
            }],
            stream: false,
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log("Ollama response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Ollama error:", errorText);
          ocrError = `Ollama error: ${response.status}`;
        } else {
          const data = await response.json();
          receiptText = data.message?.content?.trim() || "";
        }
      } catch (fetchError: any) {
        console.error("Ollama fetch error:", fetchError.message);
        ocrError = `Ollama failed: ${fetchError.message}`;
      }
    } else {
      ocrError = "Ollama API key not configured";
    }

    // Save regardless of OCR result

    await db
      .update(oneTimeExpenses)
      .set({ receiptText })
      .where(eq(oneTimeExpenses.id, expenseId));

    return NextResponse.json({
      success: true,
      imageUrl,
      receiptText,
      ocrError,
    });
  } catch (error) {
    console.error("Error uploading receipt:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get("expenseId");

    if (!expenseId) {
      return NextResponse.json({ error: "expenseId required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const [expense] = await db
      .select()
      .from(oneTimeExpenses)
      .where(and(eq(oneTimeExpenses.id, expenseId), eq(oneTimeExpenses.groupId, groupId)))
      .limit(1);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      receiptText: expense.receiptText,
    });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get("expenseId");

    if (!expenseId) {
      return NextResponse.json({ error: "expenseId required" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, session.user.id)))
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const [expense] = await db
      .select()
      .from(oneTimeExpenses)
      .where(and(eq(oneTimeExpenses.id, expenseId), eq(oneTimeExpenses.groupId, groupId)))
      .limit(1);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await db
      .update(oneTimeExpenses)
      .set({ receiptText: null })
      .where(eq(oneTimeExpenses.id, expenseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
