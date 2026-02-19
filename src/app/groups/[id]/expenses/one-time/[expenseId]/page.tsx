"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Camera, Trash2, Pencil, Check, X, DollarSign, Download, Upload } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface OneTimeExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  categoryId: string | null;
  isPaid: boolean;
  category?: Category;
  receiptText?: string | null;
}

export default function ExpenseDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const expenseId = params.expenseId as string;
  
  const [expense, setExpense] = useState<OneTimeExpense | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(false);
  const [editedReceiptText, setEditedReceiptText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [expenseRes, categoriesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/one-time-expenses?expenseId=${expenseId}`),
        fetch(`/api/groups/${groupId}/categories`),
      ]);

      const allExpenses: OneTimeExpense[] = expenseRes.ok ? await expenseRes.json() : [];
      const foundExpense = allExpenses.length > 0 ? allExpenses[0] : null;
      
      if (foundExpense) {
        setExpense(foundExpense);
        setEditedReceiptText(foundExpense.receiptText || "");
      }
      
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaid = async () => {
    if (!expense) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: expense.id,
          name: expense.name,
          amount: expense.amount,
          categoryId: expense.categoryId,
          date: expense.date,
          month: expense.month,
          year: expense.year,
          isPaid: !expense.isPaid,
        }),
      });

      if (res.ok) {
        setExpense({ ...expense, isPaid: !expense.isPaid });
        toast.success(!expense.isPaid ? "Segnata come pagata!" : "Segnata come non pagata");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const updateExpense = async (updates: Partial<OneTimeExpense>) => {
    if (!expense) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: expense.id,
          name: updates.name ?? expense.name,
          amount: updates.amount ?? expense.amount,
          categoryId: updates.categoryId ?? expense.categoryId,
          date: updates.date ?? expense.date,
          month: updates.month ?? expense.month,
          year: updates.year ?? expense.year,
          isPaid: updates.isPaid ?? expense.isPaid,
        }),
      });

      if (res.ok) {
        setExpense({ ...expense, ...updates });
        toast.success("Spesa aggiornata!");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file || !expense) return;
    
    setUploadingReceipt(true);
    toast.info("Elaborazione scontrino con AI in corso...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expenseId", expense.id);

      const res = await fetch(`/api/groups/${groupId}/receipts`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setExpense({ ...expense, receiptText: data.receiptText });
        setEditedReceiptText(data.receiptText || "");
        toast.success("Scontrino caricato e processato!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nel caricamento");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Errore nel caricamento");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const saveReceiptText = async () => {
    if (!expense) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: expense.id,
          name: expense.name,
          amount: expense.amount,
          categoryId: expense.categoryId,
          date: expense.date,
          month: expense.month,
          year: expense.year,
          isPaid: expense.isPaid,
          receiptText: editedReceiptText,
        }),
      });

      if (res.ok) {
        setExpense({ ...expense, receiptText: editedReceiptText });
        setEditingReceipt(false);
        toast.success("Testo salvato!");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const deleteReceipt = async () => {
    if (!expense || !confirm("Eliminare lo scontrino?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/receipts?expenseId=${expense.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setExpense({ ...expense, receiptText: null });
        setEditedReceiptText("");
        toast.success("Scontrino eliminato");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Caricamento...</div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Spesa non trovata</div>
      </div>
    );
  }

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleReceiptUpload(file);
            e.target.value = "";
          }
        }}
      />

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/groups/${groupId}/expenses/one-time`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Dettaglio Spesa</h1>
                <p className="text-xs text-slate-500">{expense.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Spesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <p className="font-medium">{expense.name}</p>
              </div>
              <div className="space-y-2">
                <Label>Importo</Label>
                <p className="font-medium text-xl">€ {expense.amount.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <p className="font-medium">{new Date(expense.date).toLocaleDateString("it-IT")}</p>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <p className="font-medium">
                  {expense.category ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: expense.category.color }} />
                      {expense.category.name}
                    </span>
                  ) : (
                    "Nessuna"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={expense.isPaid}
                  onCheckedChange={togglePaid}
                />
                <Label>Pagato</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Scontrino</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingReceipt}
              >
                {uploadingReceipt ? (
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {expense.receiptText ? "Ricarica" : "Carica"} scontrino
              </Button>
              {expense.receiptText && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={deleteReceipt}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!expense.receiptText ? (
              <div className="text-center py-8 text-slate-400">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuno scontrino caricato</p>
                <p className="text-sm">Carica una foto per estrarre il testo</p>
              </div>
            ) : editingReceipt ? (
              <div className="space-y-4">
                <Textarea
                  value={editedReceiptText}
                  onChange={(e) => setEditedReceiptText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Testo estratto dallo scontrino..."
                />
                <div className="flex gap-2">
                  <Button onClick={saveReceiptText}>
                    <Check className="w-4 h-4 mr-2" />
                    Salva
                  </Button>
                  <Button variant="outline" onClick={() => setEditingReceipt(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-slate-700">
                    {expense.receiptText}
                  </pre>
                </div>
                <Button variant="outline" onClick={() => setEditingReceipt(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifica testo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Receipt(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  );
}
