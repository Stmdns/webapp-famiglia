"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Receipt, Calendar, Pencil, Check, X, DollarSign } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequencyType: string;
  frequencyValue: number;
  categoryId: string | null;
  isActive: boolean;
  category?: Category;
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
  expenseId?: string | null;
}

function calculateMonthlyAmount(expense: { amount: number; frequencyType: string; frequencyValue: number }) {
  switch (expense.frequencyType) {
    case "weekly": return expense.amount * 4.33;
    case "monthly": return expense.amount;
    case "yearly": return expense.amount / 12;
    case "days": return expense.amount * (30 / expense.frequencyValue);
    case "months": return expense.amount / expense.frequencyValue;
    default: return expense.amount;
  }
}

export default function OneTimeExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [expenses, setExpenses] = useState<OneTimeExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDate, setNewDate] = useState("");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [expensesRes, categoriesRes, recurringRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/one-time-expenses?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/groups/${groupId}/categories`),
        fetch(`/api/groups/${groupId}/expenses`),
      ]);

      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (recurringRes.ok) {
        const recurringData = await recurringRes.json();
        setRecurringExpenses(recurringData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBudgetForCategory = (categoryId: string | null): number => {
    if (!categoryId) return 0;
    const categoryExpenses = recurringExpenses.filter(e => e.categoryId === categoryId && e.isActive);
    return categoryExpenses.reduce((sum, e) => sum + calculateMonthlyAmount(e), 0);
  };

  const getExpensesByCategory = () => {
    const grouped: Record<string, OneTimeExpense[]> = {};
    
    expenses.forEach(expense => {
      const catId = expense.categoryId || "uncategorized";
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(expense);
    });
    
    return grouped;
  };

  const startEdit = (expense: OneTimeExpense) => {
    setEditingId(expense.id);
    setEditName(expense.name);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.categoryId || "");
    setEditDate(expense.date.split('T')[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
    setEditCategory("");
    setEditDate("");
  };

  const saveEdit = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId,
          name: editName,
          amount: editAmount,
          categoryId: editCategory || null,
          date: editDate,
          month: currentMonth,
          year: currentYear,
          isPaid: expenses.find(e => e.id === expenseId)?.isPaid ?? false,
        }),
      });

      if (res.ok) {
        const updatedExpenses = expenses.map(e => {
          if (e.id === expenseId) {
            const category = categories.find(c => c.id === (editCategory || null));
            return {
              ...e,
              name: editName,
              amount: parseFloat(editAmount),
              categoryId: editCategory || null,
              date: editDate,
              category,
            };
          }
          return e;
        });
        setExpenses(updatedExpenses);
        cancelEdit();
        toast.success("Spesa aggiornata!");
      } else {
        toast.error("Errore nell'aggiornamento");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const togglePaid = async (expenseId: string, currentPaid: boolean) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId,
          name: expense.name,
          amount: expense.amount,
          categoryId: expense.categoryId,
          date: expense.date,
          month: expense.month,
          year: expense.year,
          isPaid: !currentPaid,
        }),
      });

      if (res.ok) {
        setExpenses(expenses.map(e => 
          e.id === expenseId ? { ...e, isPaid: !currentPaid } : e
        ));
        toast.success(!currentPaid ? "Segnata come pagata!" : "Segnata come non pagata");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAmount || !newDate) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          amount: newAmount,
          categoryId: newCategory || null,
          date: newDate,
          month: currentMonth,
          year: currentYear,
        }),
      });

      if (res.ok) {
        const expense = await res.json();
        const category = categories.find(c => c.id === (newCategory || null));
        setExpenses([...expenses, { 
          ...expense, 
          date: newDate,
          month: currentMonth,
          year: currentYear,
          isPaid: false,
          category,
        }]);
        setDialogOpen(false);
        resetForm();
        toast.success("Spesa aggiunta!");
      } else {
        toast.error("Errore nell'aggiunta");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa spesa?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/one-time-expenses?expenseId=${expenseId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setExpenses(expenses.filter(e => e.id !== expenseId));
        toast.success("Spesa eliminata");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewAmount("");
    setNewCategory("");
    setNewDate("");
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
  const totalUnpaid = totalExpenses - totalPaid;

  const expensesByCategory = getExpensesByCategory();

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/groups/${groupId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Spese Singole</h1>
                <p className="text-xs text-slate-500">{months[currentMonth - 1]} {currentYear}</p>
              </div>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi spesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi spesa singola</DialogTitle>
              </DialogHeader>
              <form onSubmit={addExpense} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Input
                    placeholder="Es. Spesa al supermercato"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Importo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Aggiungi</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Totale Mensile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€ {totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-blue-100 mt-1">{expenses.length} spese</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Pagato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€ {totalPaid.toFixed(2)}</div>
              <p className="text-xs text-green-100 mt-1">questo mese</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${totalUnpaid >= 0 ? 'from-amber-500 to-amber-600' : 'from-green-500 to-green-600'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {totalUnpaid >= 0 ? 'Da Pagare' : 'Surplus'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€ {Math.abs(totalUnpaid).toFixed(2)}</div>
              <p className="text-xs text-amber-100 mt-1">{totalUnpaid >= 0 ? 'rimanente' : 'accantonato'}</p>
            </CardContent>
          </Card>
        </div>

        {Object.entries(expensesByCategory).map(([catId, catExpenses]) => {
          const category = categories.find(c => c.id === catId);
          const catName = category?.name || "Altro";
          const catColor = category?.color || "#6b7280";
          const budget = getBudgetForCategory(catId === "uncategorized" ? null : catId);
          const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
          const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          
          return (
            <Card key={catId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                    <CardTitle className="text-lg">{catName}</CardTitle>
                  </div>
                  {budget > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium">Budget: €{budget.toFixed(2)}</p>
                      <p className={`text-xs ${spent > budget ? 'text-red-500' : 'text-slate-500'}`}>
                        Speso: €{spent.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                {budget > 0 && (
                  <Progress 
                    value={progress} 
                    className="h-2"
                    style={{ 
                      backgroundColor: '#e2e8f0',
                    }}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {catExpenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className={`flex items-center justify-between p-2 rounded-lg ${expense.isPaid ? 'bg-green-50' : 'bg-slate-50'}`}
                  >
                    {editingId === expense.id ? (
                      <div className="flex items-center gap-3 w-full">
                        <Switch
                          checked={expense.isPaid}
                          onCheckedChange={() => togglePaid(expense.id, expense.isPaid)}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Descrizione"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="Importo"
                          />
                          <Select value={editCategory} onValueChange={setEditCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:text-green-700 hover:bg-green-50"
                            onClick={() => saveEdit(expense.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={cancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={expense.isPaid}
                            onCheckedChange={() => togglePaid(expense.id, expense.isPaid)}
                          />
                          <div>
                            <p className="font-medium">{expense.name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(expense.date).toLocaleDateString("it-IT")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">€ {expense.amount.toFixed(2)}</p>
                            <p className="text-xs text-slate-500">{expense.isPaid ? "Pagato" : "Da pagare"}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            onClick={() => startEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {expenses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nessuna spesa singola questo mese</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
