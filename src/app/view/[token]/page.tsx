"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  Users,
  Euro,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  RefreshCw,
  Receipt,
  Repeat,
  PiggyBank,
} from "lucide-react";

interface MemberData {
  id: string;
  name: string;
  quotaPercent: number;
  quotaAmount: number;
  paid: number;
  due: number;
  balance: number;
  status: "paid" | "must_pay" | "excess" | "inactive";
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequencyType: string;
  frequencyValue: number;
  dayOfMonth: number | null;
  isActive: boolean;
}

interface OneTimeExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  isPaid: boolean;
  receiptText: string | null;
}

interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amountPaid: number;
  isConfirmed: boolean;
  createdAt: string;
}

interface GroupData {
  month: number;
  year: number;
  monthName: string;
  summary: {
    totalExpenses: number;
    totalPaid: number;
    totalDue: number;
    progressPercent: number;
    recurringCount: number;
    oneTimeCount: number;
  };
  group: {
    id: string;
    name: string;
  };
  members: MemberData[];
  recurringExpenses: RecurringExpense[];
  oneTimeExpenses: OneTimeExpense[];
  payments: Payment[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function getStatusBadge(status: MemberData["status"]) {
  switch (status) {
    case "paid":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />In pari</Badge>;
    case "must_pay":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" />Da pagare</Badge>;
    case "excess":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><ArrowRightLeft className="w-3 h-3 mr-1" />Eccedenza</Badge>;
    default:
      return <Badge variant="secondary">Inattivo</Badge>;
  }
}

function getStatusColor(status: MemberData["status"]): string {
  switch (status) {
    case "paid": return "text-emerald-600";
    case "must_pay": return "text-amber-600";
    case "excess": return "text-blue-600";
    default: return "text-slate-400";
  }
}

function getStatusBg(status: MemberData["status"]): string {
  switch (status) {
    case "paid": return "bg-emerald-50 border-emerald-200";
    case "must_pay": return "bg-amber-50 border-amber-200";
    case "excess": return "bg-blue-50 border-blue-200";
    default: return "bg-slate-50 border-slate-200";
  }
}

export default function ViewGroupPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/view/${token}?month=${currentMonth}&year=${currentYear}`);
      
      if (response.status === 404) {
        setError("Link di visualizzazione non valido");
        return;
      }

      if (!response.ok) {
        throw new Error("Errore nel caricamento dei dati");
      }

      const data = await response.json();
      setGroupData(data);
    } catch (err) {
      console.error("Error fetching group data:", err);
      setError("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  }, [token, currentMonth, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
  };

  if (loading && !groupData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!groupData) {
    return null;
  }

  const { summary, members, recurringExpenses, oneTimeExpenses, payments, group } = groupData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50">
      {/* Read-only Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Visualizzazione sola lettura - Nessuna modifica possibile</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{group.name}</h1>
            <p className="text-slate-500 mt-1">Riepilogo mensile spese familiari</p>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="h-8 w-8 rounded-lg hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-1.5 min-w-[160px] text-center">
              <span className="font-semibold text-slate-900">{groupData.monthName}</span>
              <span className="text-slate-500 ml-1">{currentYear}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8 rounded-lg hover:bg-slate-100">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToCurrentMonth}
              className="text-xs h-7 px-2 rounded-lg hover:bg-slate-100"
            >
              Oggi
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Riepilogo {groupData.monthName} {currentYear}</h2>
                <p className="text-blue-100 text-sm">{summary.recurringCount} ricorrenti + {summary.oneTimeCount} una tantum</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-blue-100" />
                  <span className="text-blue-100 text-sm">Totale spese</span>
                </div>
                <div className="text-2xl font-bold">€{formatCurrency(summary.totalExpenses)}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span className="text-blue-100 text-sm">Già pagato</span>
                </div>
                <div className="text-2xl font-bold text-emerald-200">€{formatCurrency(summary.totalPaid)}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-200" />
                  <span className="text-blue-100 text-sm">Da pagare</span>
                </div>
                <div className="text-2xl font-bold text-amber-200">€{formatCurrency(summary.totalDue)}</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-100">Progresso pagamento</span>
                <span className="font-medium">{summary.progressPercent}%</span>
              </div>
              <Progress value={summary.progressPercent} className="h-3 bg-white/20 [&>div]:bg-white" />
            </div>
          </div>
        </Card>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {members.map((member) => (
            <Card 
              key={member.id} 
              className={`border ${getStatusBg(member.status)} transition-all hover:shadow-md`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center ${getStatusColor(member.status)}`}>
                      <span className="text-sm font-semibold">{member.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{member.name}</CardTitle>
                      <p className="text-xs text-slate-500">{member.quotaPercent}% quota</p>
                    </div>
                  </div>
                  {getStatusBadge(member.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Quota mensile</p>
                    <p className="font-semibold">€{formatCurrency(member.quotaAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Già pagato</p>
                    <p className={`font-semibold ${member.paid > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                      €{formatCurrency(member.paid)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Da pagare</p>
                    <p className={`font-bold text-lg ${member.due > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      €{formatCurrency(member.due)}
                    </p>
                  </div>
                </div>
                {member.balance !== 0 && (
                  <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-sm ${member.balance > 0 ? "text-blue-600" : "text-amber-600"}`}>
                    {member.balance > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>Hai pagato €{formatCurrency(Math.abs(member.balance))} in più</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4" />
                        <span>Devi ancora €{formatCurrency(Math.abs(member.balance))}</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expenses Tabs */}
        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="recurring" className="w-full">
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="recurring" className="text-sm gap-2">
                  <Repeat className="w-4 h-4" />
                  Ricorrenti ({recurringExpenses.length})
                </TabsTrigger>
                <TabsTrigger value="onetime" className="text-sm gap-2">
                  <Receipt className="w-4 h-4" />
                  Una Tantum ({oneTimeExpenses.length})
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="recurring" className="p-6">
              {recurringExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna spesa ricorrente questo mese</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Repeat className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{expense.name}</p>
                          <p className="text-sm text-slate-500">
                            Ogni {expense.frequencyValue} {expense.frequencyType}
                            {expense.dayOfMonth && ` • Giorno ${expense.dayOfMonth}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-900">€{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  ))}
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                    <span className="font-medium text-blue-900">Totale ricorrenti</span>
                    <span className="font-bold text-xl text-blue-700">
                      €{formatCurrency(recurringExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="onetime" className="p-6">
              {oneTimeExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessuna spesa una tantum questo mese</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {oneTimeExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${expense.isPaid ? "bg-emerald-100" : "bg-amber-100"}`}>
                          <Receipt className={`w-5 h-5 ${expense.isPaid ? "text-emerald-600" : "text-amber-600"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{expense.name}</p>
                          <p className="text-sm text-slate-500">{formatDate(expense.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-900">€{formatCurrency(expense.amount)}</p>
                        <Badge variant={expense.isPaid ? "default" : "secondary"} className={expense.isPaid ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ""}>
                          {expense.isPaid ? "Pagata" : "Da pagare"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl">
                    <span className="font-medium text-amber-900">Totale una tantum</span>
                    <span className="font-bold text-xl text-amber-700">
                      €{formatCurrency(oneTimeExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Recent Payments */}
        {payments.length > 0 && (
          <Card className="mt-8 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                Pagamenti del mese
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-emerald-600">{payment.memberName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{payment.memberName}</p>
                        <p className="text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">+€{formatCurrency(payment.amountPaid)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Dati aggiornati al {new Date().toLocaleDateString("it-IT", { 
            day: "2-digit", 
            month: "long", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}</p>
        </div>
      </div>
    </div>
  );
}
