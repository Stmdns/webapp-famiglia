"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGroupStore } from "@/store/group";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Home, Users, Receipt, Settings, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, History, Trash2, X
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const searchParams = useSearchParams();
  const groupId = params.id as string;

  const { members, setMembers, expenses, setExpenses } = useGroupStore();
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ id: string; name: string } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const monthParam = searchParams.get("month");
    return monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;
  });
  const [currentYear, setCurrentYear] = useState(() => {
    const yearParam = searchParams.get("year");
    return yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, currentMonth, currentYear]);

  const fetchData = async () => {
    try {
      const [groupInfoRes, membersRes, expensesRes, dataRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/members`),
        fetch(`/api/groups/${groupId}/expenses?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/groups/${groupId}/payments?month=${currentMonth}&year=${currentYear}`),
      ]);

      if (groupInfoRes.ok) setGroupInfo(await groupInfoRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (dataRes.ok) setGroupData(await dataRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch {
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
    if (!confirm("Annullare questo versamento?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/payments?paymentId=${paymentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Versamento annullato");
        fetchPayments();
        fetchData();
      } else {
        toast.error("Errore");
      }
    } catch {
      toast.error("Errore");
    }
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    router.push(`/groups/${groupId}?month=${newMonth}&year=${newYear}`);
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Caricamento...</div>
      </div>
    );
  }

  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const totalPaid = groupData?.memberQuotas.reduce((sum, m) => sum + m.paid, 0) ?? 0;
  const totalDue = groupData?.totalMonthly ?? 0;
  const remaining = totalDue - totalPaid;

  const sortedExpenses = [...(groupData?.expenses ?? [])].sort((a, b) => 
    (b.monthlyAmount ?? 0) - (a.monthlyAmount ?? 0)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Storico - {months[currentMonth - 1]} {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="text-center text-slate-500 py-4 text-sm">Nessun versamento</p>
            ) : (
              payments.map((payment) => {
                const member = members.find((m) => m.id === payment.memberId);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{member?.name || "Membro"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">€{payment.amountPaid.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deletePayment(payment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Registra versamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={registerPayment} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Membro</Label>
              <select
                className="w-full p-2 border rounded-md text-sm"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
              >
                <option value="">Seleziona</option>
                {groupData?.memberQuotas.map((mq) => (
                  <option key={mq.member.id} value={mq.member.id}>
                    {mq.member.name} (€{mq.calculated.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Importo (€)</Label>
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

      <header className="bg-white border-b border-slate-200 px-3 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-semibold text-slate-900 text-sm">{groupInfo?.name || "Gruppo"}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleMonthChange(-1)} className="p-1.5 hover:bg-slate-100 rounded">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-medium min-w-[60px] text-center">
              {months[currentMonth - 1]} {currentYear}
            </span>
            <button onClick={() => handleMonthChange(1)} className="p-1.5 hover:bg-slate-100 rounded">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-base">Impostazioni</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Link href={`/groups/${groupId}/members`} onClick={() => setSettingsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      <Users className="w-4 h-4 mr-2" /> Membri
                    </Button>
                  </Link>
                  <Link href={`/groups/${groupId}/expenses?month=${currentMonth}&year=${currentYear}`} onClick={() => setSettingsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      <Receipt className="w-4 h-4 mr-2" /> Spese Fisse
                    </Button>
                  </Link>
                  <Link href={`/groups/${groupId}/reports`} onClick={() => setSettingsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      <Home className="w-4 h-4 mr-2" /> Report
                    </Button>
                  </Link>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2 text-center bg-slate-900 text-white">
            <p className="text-[10px] text-slate-400 uppercase">Totale</p>
            <p className="text-lg font-bold">€{totalDue.toFixed(0)}</p>
          </Card>
          <Card className="p-2 text-center bg-red-50 border-red-100">
            <p className="text-[10px] text-red-500 uppercase">Da versare</p>
            <p className="text-lg font-bold text-red-600">€{Math.max(0, remaining).toFixed(0)}</p>
          </Card>
          <Card className="p-2 text-center bg-green-50 border-green-100">
            <p className="text-[10px] text-green-600 uppercase">Versato</p>
            <p className="text-lg font-bold text-green-600">€{totalPaid.toFixed(0)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-500 uppercase">Membri</h2>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchPayments}>
                <History className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {groupData?.memberQuotas.map((mq) => (
                <div key={mq.member.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${mq.confirmed ? "bg-green-500" : "bg-slate-300"}`} />
                      <span className="font-medium">{mq.member.name}</span>
                    </span>
                    <span className="text-slate-600">€{mq.calculated.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Progress value={Math.min((mq.paid / mq.calculated) * 100, 100)} className="h-1 flex-1" />
                    <span className="text-[10px] text-slate-400 w-8">{mq.member.quotaPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full mt-3 h-9 text-xs bg-green-600 hover:bg-green-700">
                  <Plus className="w-3 h-3 mr-1" /> Versa
                </Button>
              </DialogTrigger>
            </Dialog>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-500 uppercase">Spese</h2>
              <span className="text-[10px] text-slate-400">{groupData?.expenses.length || 0}</span>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {sortedExpenses.slice(0, 8).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: expense.category?.color || "#6b7280" }}
                    />
                    <span className="truncate text-slate-700">{expense.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">€{expense.monthlyAmount?.toFixed(0)}</span>
                </div>
              ))}
              {(!groupData?.expenses || groupData.expenses.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">Nessuna spesa</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
