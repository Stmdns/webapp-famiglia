import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { oneTimeExpenses, groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import ollama from "ollama";

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

    const receiptsDir = join(process.cwd(), "public", "receipts", groupId);
    if (!existsSync(receiptsDir)) {
      await mkdir(receiptsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${expenseId}_${timestamp}.${extension}`;
    const filepath = join(receiptsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    const imageUrl = `/receipts/${groupId}/${filename}`;

    // Convert image to base64
    const base64Image = buffer.toString("base64");

    // Call Ollama for OCR
    let receiptText = "";
    try {
      const response = await ollama.chat({
        model: "glm-ocr",
        messages: [
          {
            role: "user",
            content: "Extract all text from this receipt. Return only the raw text, nothing else. If there's no text, return an empty string.",
            images: [base64Image],
          },
        ],
      });
      receiptText = response.message.content.trim();
    } catch (ocrError) {
      console.error("OCR Error:", ocrError);
      receiptText = "";
    }

    await db
      .update(oneTimeExpenses)
      .set({ receiptText })
      .where(eq(oneTimeExpenses.id, expenseId));

    return NextResponse.json({
      success: true,
      imageUrl,
      receiptText,
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
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group || group.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [expense] = await db
      .select()
      .from(oneTimeExpenses)
      .where(and(eq(oneTimeExpenses.id, expenseId), eq(oneTimeExpenses.groupId, groupId)))
      .limit(1);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const receiptsDir = join(process.cwd(), "public", "receipts", groupId);
    
    if (existsSync(receiptsDir)) {
      const files = await import("fs/promises").then(fs => fs.readdir(receiptsDir));
      const matchingFile = files.find(f => f.startsWith(expenseId));
      
      if (matchingFile) {
        const filepath = join(receiptsDir, matchingFile);
        await unlink(filepath);
      }
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
