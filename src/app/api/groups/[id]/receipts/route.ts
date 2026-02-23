import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { oneTimeExpenses, groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";

const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY;
const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "https://webapp-budget.cognitiveservices.azure.com";

console.log("AZURE_VISION_KEY present:", !!AZURE_VISION_KEY);
console.log("AZURE_VISION_ENDPOINT:", AZURE_VISION_ENDPOINT);

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

    // Call Azure Computer Vision for OCR
    let receiptText = "";
    let ocrError = null;

    if (!AZURE_VISION_KEY) {
      ocrError = "Azure Vision key not configured";
    } else {
      try {
        console.log("Calling Azure Computer Vision API...");
        
        const response = await fetch(
          `${AZURE_VISION_ENDPOINT}/vision/v3.2/read/analyze`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY,
            },
            body: JSON.stringify({
              url: `data:${file.type};base64,${base64Image}`,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Azure Vision error:", response.status, errorText);
          ocrError = `Azure Vision error: ${response.status}`;
        } else {
          const data = await response.json();
          const operationLocation = response.headers.get("Operation-Location");
          
          if (operationLocation) {
            let result = null;
            let retries = 0;
            const maxRetries = 10;
            
            while (retries < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              
              const resultResponse = await fetch(operationLocation, {
                headers: {
                  "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY,
                },
              });
              
              const resultData = await resultResponse.json();
              
              if (resultData.status === "succeeded") {
                result = resultData;
                break;
              } else if (resultData.status === "failed") {
                ocrError = "Azure Vision OCR failed";
                break;
              }
              
              retries++;
            }
            
            if (result?.analyzeResult?.readResults) {
              for (const page of result.analyzeResult.readResults) {
                for (const line of page.lines) {
                  receiptText += line.text + "\n";
                }
              }
            }
          }
        }
      } catch (fetchError: any) {
        console.error("Azure Vision fetch error:", fetchError.message);
        ocrError = `Fetch error: ${fetchError.message}`;
      }
    }

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
