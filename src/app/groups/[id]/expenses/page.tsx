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
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Receipt, Calendar, Pencil, Check, X, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequencyType: string;
  frequencyValue: number;
  categoryId: string | null;
  isActive: boolean;
  category?: Category;
  monthlyAmount?: number;
  paidAmount?: number;
  startMonth?: number | null;
  startYear?: number | null;
  endMonth?: number | null;
  endYear?: number | null;
}

interface ExpensePayment {
  id: string;
  expenseId: string;
  amount: number;
}

const FREQUENCIES = [
  { value: "weekly", label: "Settimanale" },
  { value: "monthly", label: "Mensile" },
  { value: "yearly", label: "Annuale" },
  { value: "days", label: "Ogni N giorni" },
  { value: "months", label: "Ogni N mesi" },
];

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [editFrequencyValue, setEditFrequencyValue] = useState(1);
  const [editStartMonth, setEditStartMonth] = useState("");
  const [editStartYear, setEditStartYear] = useState("");
  const [editEndMonth, setEditEndMonth] = useState("");
  const [editEndYear, setEditEndYear] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newFrequency, setNewFrequency] = useState("monthly");
  const [newFrequencyValue, setNewFrequencyValue] = useState(1);
  const [newDayOfMonth, setNewDayOfMonth] = useState("");
  const [newStartMonth, setNewStartMonth] = useState("");
  const [newStartYear, setNewStartYear] = useState("");
  const [newEndMonth, setNewEndMonth] = useState("");
  const [newEndYear, setNewEndYear] = useState("");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [currentMonthState, setCurrentMonthState] = useState(currentMonth);
  const [currentYearState, setCurrentYearState] = useState(currentYear);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, currentMonthState, currentYearState]);

  const fetchData = async () => {
    try {
      const [expensesRes, categoriesRes, paymentsRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/expenses?month=${currentMonthState}&year=${currentYearState}`),
        fetch(`/api/groups/${groupId}/categories`),
        fetch(`/api/groups/${groupId}/expensePayments?month=${currentMonthState}&year=${currentYearState}`),
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (paymentsRes.ok) setExpensePayments(await paymentsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpensePaidAmount = (expenseId: string) => {
    const payment = expensePayments.find(p => p.expenseId === expenseId);
    return payment?.amount || 0;
  };

  const calculateMonthly = (amount: number, type: string, value: number) => {
    switch (type) {
      case "weekly": return amount * 4.33;
      case "monthly": return amount;
      case "yearly": return amount / 12;
      case "days": return amount * (30 / value);
      case "months": return amount / value;
      default: return amount;
    }
  };

  const openPaymentDialog = (expenseId: string, currentAmount: number) => {
    setSelectedExpenseId(expenseId);
    setPaymentAmount(currentAmount > 0 ? currentAmount.toString() : "");
    setPaymentDialogOpen(true);
  };

  const savePayment = async () => {
    if (!selectedExpenseId || !paymentAmount) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/expensePayments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId: selectedExpenseId,
          month: currentMonth,
          year: currentYear,
          amount: paymentAmount,
        }),
      });

      if (res.ok) {
        const existingIndex = expensePayments.findIndex(p => p.expenseId === selectedExpenseId);
        if (existingIndex >= 0) {
          const updated = [...expensePayments];
          updated[existingIndex] = { ...updated[existingIndex], amount: parseFloat(paymentAmount) };
          setExpensePayments(updated);
        } else {
          const data = await res.json();
          setExpensePayments([...expensePayments, { id: data.id, expenseId: selectedExpenseId, amount: parseFloat(paymentAmount) }]);
        }
        setPaymentDialogOpen(false);
        toast.success("Pagamento registrato!");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const deletePayment = async (expenseId: string) => {
    const payment = expensePayments.find(p => p.expenseId === expenseId);
    if (!payment) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/expensePayments?paymentId=${payment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setExpensePayments(expensePayments.filter(p => p.expenseId !== expenseId));
        toast.success("Pagamento rimosso");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditName(expense.name);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.categoryId || "");
    setEditFrequency(expense.frequencyType);
    setEditFrequencyValue(expense.frequencyValue);
    setEditStartMonth(expense.startMonth?.toString() || "");
    setEditStartYear(expense.startYear?.toString() || "");
    setEditEndMonth(expense.endMonth?.toString() || "");
    setEditEndYear(expense.endYear?.toString() || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
    setEditCategory("");
    setEditFrequency("");
    setEditFrequencyValue(1);
    setEditStartMonth("");
    setEditStartYear("");
    setEditEndMonth("");
    setEditEndYear("");
  };

  const saveEdit = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId,
          name: editName,
          amount: editAmount,
          categoryId: editCategory || null,
          frequencyType: editFrequency,
          frequencyValue: editFrequencyValue,
          isActive: expenses.find(e => e.id === expenseId)?.isActive ?? true,
          startMonth: editStartMonth || null,
          startYear: editStartYear || null,
          endMonth: editEndMonth || null,
          endYear: editEndYear || null,
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
              frequencyType: editFrequency,
              frequencyValue: editFrequencyValue,
              category,
              monthlyAmount: calculateMonthly(parseFloat(editAmount), editFrequency, editFrequencyValue),
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

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAmount) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          amount: newAmount,
          categoryId: newCategory || null,
          frequencyType: newFrequency,
          frequencyValue: newFrequencyValue,
          dayOfMonth: newDayOfMonth ? parseInt(newDayOfMonth) : null,
          startMonth: newStartMonth || null,
          startYear: newStartYear || null,
          endMonth: newEndMonth || null,
          endYear: newEndYear || null,
        }),
      });

      if (res.ok) {
        const expense = await res.json();
        setExpenses([...expenses, { 
          ...expense, 
          monthlyAmount: calculateMonthly(parseFloat(newAmount), newFrequency, newFrequencyValue) 
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

  const toggleExpense = async (expenseId: string, isActive: boolean) => {
    try {
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) return;

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId,
          name: expense.name,
          amount: expense.amount,
          categoryId: expense.categoryId,
          frequencyType: expense.frequencyType,
          frequencyValue: expense.frequencyValue,
          isActive: !isActive,
        }),
      });

      if (res.ok) {
        setExpenses(expenses.map(e => 
          e.id === expenseId ? { ...e, isActive: !isActive } : e
        ));
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa spesa?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses?expenseId=${expenseId}`, {
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
    setNewFrequency("monthly");
    setNewFrequencyValue(1);
    setNewDayOfMonth("");
    setNewStartMonth("");
    setNewStartYear("");
    setNewEndMonth("");
    setNewEndYear("");
  };

  const activeExpenses = expenses.filter(e => e.isActive);
  const totalMonthly = activeExpenses.reduce((sum, e) => sum + (e.monthlyAmount || calculateMonthly(e.amount, e.frequencyType, e.frequencyValue)), 0);
  const totalPaid = expensePayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalMonthly - totalPaid;

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Importo pagato (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <Button onClick={savePayment} className="w-full">Salva</Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/groups/${groupId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Spese Ricorrenti</h1>
                  <p className="text-xs text-slate-500">Gestisci le spese fisse</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      if (currentMonthState === 1) {
                        setCurrentMonthState(12);
                        setCurrentYearState(currentYearState - 1);
                      } else {
                        setCurrentMonthState(currentMonthState - 1);
                      }
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[80px] text-center">
                    {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][currentMonthState-1]} {currentYearState}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      if (currentMonthState === 12) {
                        setCurrentMonthState(1);
                        setCurrentYearState(currentYearState + 1);
                      } else {
                        setCurrentMonthState(currentMonthState + 1);
                      }
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
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
                <DialogTitle>Aggiungi spesa ricorrente</DialogTitle>
              </DialogHeader>
              <form onSubmit={addExpense} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome spesa</Label>
                  <Input
                    placeholder="Es. Supermercato"
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
                  <Label>Frequenza</Label>
                  <Select value={newFrequency} onValueChange={setNewFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(newFrequency === "days" || newFrequency === "months") && (
                  <div className="space-y-2">
                    <Label>ogni</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newFrequencyValue}
                      onChange={(e) => setNewFrequencyValue(parseInt(e.target.value))}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Giorno del mese (opzionale)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1-31"
                    value={newDayOfMonth}
                    onChange={(e) => setNewDayOfMonth(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Da mese</Label>
                    <Select value={newStartMonth || "always"} onValueChange={(v) => setNewStartMonth(v === "always" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Da sempre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Da sempre</SelectItem>
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                          <SelectItem key={m} value={m.toString()}>{['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][m-1]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anno</Label>
                    <Select value={newStartYear || "always"} onValueChange={(v) => setNewStartYear(v === "always" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sempre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Sempre</SelectItem>
                        <SelectItem value={currentYearState.toString()}>{currentYearState}</SelectItem>
                        <SelectItem value={(currentYearState + 1).toString()}>{currentYearState + 1}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>A mese</Label>
                    <Select value={newEndMonth || "always"} onValueChange={(v) => setNewEndMonth(v === "always" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Per sempre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Per sempre</SelectItem>
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                          <SelectItem key={m} value={m.toString()}>{['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][m-1]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anno</Label>
                    <Select value={newEndYear || "always"} onValueChange={(v) => setNewEndYear(v === "always" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Per sempre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Per sempre</SelectItem>
                        <SelectItem value={currentYearState.toString()}>{currentYearState}</SelectItem>
                        <SelectItem value={(currentYearState + 1).toString()}>{currentYearState + 1}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              <div className="text-2xl font-bold">€ {totalMonthly.toFixed(2)}</div>
              <p className="text-xs text-blue-100 mt-1">{activeExpenses.length} spese attive</p>
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

          <Card className={`bg-gradient-to-br ${remaining >= 0 ? 'from-amber-500 to-amber-600' : 'from-red-500 to-red-600'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {remaining >= 0 ? 'Da Pagare' : 'Surplus'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€ {Math.abs(remaining).toFixed(2)}</div>
              <p className="text-xs text-amber-100 mt-1">{remaining >= 0 ? 'rimanente' : 'accantonato'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => {
            const paidAmount = getExpensePaidAmount(expense.id);
            const expectedAmount = expense.monthlyAmount || calculateMonthly(expense.amount, expense.frequencyType, expense.frequencyValue);
            const isPaid = paidAmount >= expectedAmount;
            
            return (
              <Card key={expense.id} className={`transition-opacity ${!expense.isActive && 'opacity-50'}`}>
                <CardContent className="py-4">
                  {editingId === expense.id ? (
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={expense.isActive}
                        onCheckedChange={() => toggleExpense(expense.id, expense.isActive)}
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome"
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
                        <Select value={editFrequency} onValueChange={setEditFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(editFrequency === "days" || editFrequency === "months") && (
                          <Input
                            type="number"
                            min="1"
                            value={editFrequencyValue}
                            onChange={(e) => setEditFrequencyValue(parseInt(e.target.value))}
                            placeholder="ogni"
                          />
                        )}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={expense.isActive}
                          onCheckedChange={() => toggleExpense(expense.id, expense.isActive)}
                        />
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: expense.category?.color || '#6b7280' }}
                        />
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-sm text-slate-500">
                            {expense.frequencyType === 'weekly' && 'Settimanale'}
                            {expense.frequencyType === 'monthly' && 'Mensile'}
                            {expense.frequencyType === 'yearly' && 'Annuale'}
                            {expense.frequencyType === 'days' && `Ogni ${expense.frequencyValue} giorni`}
                            {expense.frequencyType === 'months' && `Ogni ${expense.frequencyValue} mesi`}
                            {expense.category && ` • ${expense.category.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">€ {expectedAmount.toFixed(2)}/mese</p>
                          <p className="text-xs text-slate-500">
                            {paidAmount > 0 ? `Pagato: €${paidAmount.toFixed(2)}` : 'Non pagato'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={`${isPaid ? 'text-green-500 hover:text-green-700' : 'text-amber-500 hover:text-amber-700'} hover:bg-slate-100`}
                          onClick={() => openPaymentDialog(expense.id, paidAmount)}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        {paidAmount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deletePayment(expense.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {expenses.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nessuna spesa configurata</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
