"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGroupStore } from "@/store/group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { 
  Home, Users, Receipt, BarChart3, ArrowLeft, 
  TrendingUp, CheckCircle2, AlertCircle, Euro, ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface MemberQuota {
  member: {
    id: string;
    name: string;
    quotaPercent: number;
  };
  calculated: number;
  paid: number;
  confirmed: boolean;
}

interface GroupData {
  totalMonthly: number;
  memberQuotas: MemberQuota[];
  expensesByCategory: Record<string, { total: number; color: string }>;
  expenses: any[];
}

export default function GroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const { members, setMembers, categories, setCategories, expenses, setExpenses } = useGroupStore();
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, currentMonth, currentYear]);

  const fetchData = async () => {
    try {
      const [membersRes, categoriesRes, expensesRes, dataRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/members`),
        fetch(`/api/groups/${groupId}/categories`),
        fetch(`/api/groups/${groupId}/expenses`),
        fetch(`/api/groups/${groupId}/payments?month=${currentMonth}&year=${currentYear}`),
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (dataRes.ok) setGroupData(await dataRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = groupData 
    ? Object.entries(groupData.expensesByCategory).map(([name, data]) => ({
        name,
        value: Math.round(data.total * 100) / 100,
        color: data.color,
      }))
    : [];

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

  const registerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !paymentAmount) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          month: currentMonth,
          year: currentYear,
          amountPaid: parseFloat(paymentAmount),
        }),
      });

      if (res.ok) {
        toast.success("Versamento registrato!");
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        setSelectedMemberId("");
        fetchData();
      } else {
        toast.error("Errore nel versamento");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/payments?month=${currentMonth}&year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setHistoryDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("Sei sicuro di voler annullare questo versamento?")) return;
    
    try {
      const res = await fetch(`/api/groups/${groupId}/payments?paymentId=${paymentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Versamento annullato");
        fetchPayments();
        fetchData();
      } else {
        toast.error("Errore nell'annullamento");
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

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Storico versamenti - {months[currentMonth - 1]} {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nessun versamento registrato</p>
            ) : (
              payments.map((payment) => {
                const member = members.find(m => m.id === payment.memberId);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member?.name || "Membro"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">€ {payment.amountPaid.toFixed(2)}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deletePayment(payment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-xs text-slate-500">Mese {currentMonth}/{currentYear}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/groups/${groupId}/members`}>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Membri
              </Button>
            </Link>
            <Link href={`/groups/${groupId}/expenses`}>
              <Button variant="outline" size="sm">
                <Receipt className="w-4 h-4 mr-2" />
                Spese Fisse
              </Button>
            </Link>
            <Link href={`/groups/${groupId}/expenses/one-time`}>
              <Button variant="outline" size="sm">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Spese Singole
              </Button>
            </Link>
            <Link href={`/groups/${groupId}/reports`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Report
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="expenses">Dettaglio Spese</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Totale Mensile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    € {groupData?.totalMonthly.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-blue-100 mt-1">da distribuire</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Versato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    € {groupData?.memberQuotas.reduce((sum, m) => sum + m.paid, 0).toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-green-100 mt-1">
                    {groupData?.memberQuotas.filter(m => m.confirmed).length || 0} confermato/i
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Da Versare
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">
                    € {((groupData?.totalMonthly ?? 0) - (groupData?.memberQuotas?.reduce((sum, m) => sum + m.paid, 0) ?? 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-amber-100 mt-1">rimanente</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Quote Membri</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={fetchPayments}>
                        Storico
                      </Button>
                      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Euro className="w-4 h-4 mr-1" />
                            Versamento
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Registra versamento</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={registerPayment} className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Membro</Label>
                            <select 
                              className="w-full p-2 border rounded-md"
                              value={selectedMemberId}
                              onChange={(e) => setSelectedMemberId(e.target.value)}
                              required
                            >
                              <option value="">Seleziona membro</option>
                              {groupData?.memberQuotas.map((mq) => (
                                <option key={mq.member.id} value={mq.member.id}>
                                  {mq.member.name} (da versare: € {mq.calculated.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Importo versato (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full">Registra</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupData?.memberQuotas.map((mq) => (
                    <div key={mq.member.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{mq.member.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">€ {mq.calculated.toFixed(2)}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({mq.member.quotaPercent}%)
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min((mq.paid / mq.calculated) * 100, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Versato: € {mq.paid.toFixed(2)}</span>
                        <Badge variant={mq.confirmed ? "default" : "secondary"} className={mq.confirmed ? "bg-green-500" : ""}>
                          {mq.confirmed ? "Confermato" : "In attesa"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Spese per Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: €${value}`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      Nessuna spesa configurata
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Spese Ricorrenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupData?.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: expense.category?.color || '#6b7280' }}
                        />
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-xs text-slate-500">
                            {expense.frequencyType === 'weekly' && 'Settimanale'}
                            {expense.frequencyType === 'monthly' && 'Mensile'}
                            {expense.frequencyType === 'yearly' && 'Annuale'}
                            {expense.frequencyType === 'days' && `Ogni ${expense.frequencyValue} giorni`}
                            {expense.frequencyType === 'months' && `Ogni ${expense.frequencyValue} mesi`}
                            {expense.category && ` • ${expense.category.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€ {expense.monthlyAmount?.toFixed(2)}/mese</p>
                        <p className="text-xs text-slate-500">€ {expense.amount} {expense.frequencyType}</p>
                      </div>
                    </div>
                  ))}
                  {(!groupData?.expenses || groupData.expenses.length === 0) && (
                    <div className="text-center py-8 text-slate-400">
                      Nessuna spesa configurata
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
