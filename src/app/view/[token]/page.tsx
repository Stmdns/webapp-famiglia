"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Home, ArrowLeft, TrendingUp, CheckCircle2, AlertCircle, Euro,
  ChevronLeft, ChevronRight, Lock, Receipt
} from "lucide-react";
import Link from "next/link";

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
  group: {
    id: string;
    name: string;
  };
}

export default function ViewGroupPage() {
  const params = useParams();
  const token = params.token as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [currentMonthState, setCurrentMonthState] = useState(() => {
    const monthParam = searchParams.get('month');
    return monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;
  });
  const [currentYearState, setCurrentYearState] = useState(() => {
    const yearParam = searchParams.get('year');
    return yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  });

  const currentMonth = currentMonthState;
  const currentYear = currentYearState;

  useEffect(() => {
    fetchData();
  }, [currentMonth, currentYear, token]);

  const fetchData = async () => {
    try {
      const dataRes = await fetch(`/api/view/${token}?month=${currentMonth}&year=${currentYear}`);
      if (dataRes.ok) {
        setGroupData(await dataRes.json());
      }
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

  const handleMonthChange = (newMonth: number) => {
    setCurrentMonthState(newMonth);
    router.push(`/view/${token}?month=${newMonth}&year=${currentYear}`);
  };

  const handleYearChange = (newYear: number) => {
    setCurrentYearState(newYear);
    router.push(`/view/${token}?month=${currentMonth}&year=${newYear}`);
  };

  if (loading) {
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">Visualizzazione sola lettura</span>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-900">{groupData?.group.name}</h1>
                <p className="text-xs text-slate-500">Mese {currentMonth}/{currentYear}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <ChevronLeft
              className="w-5 h-5 cursor-pointer text-slate-600 hover:text-slate-900"
              onClick={() => {
                if (currentMonth === 1) {
                  handleMonthChange(12);
                  handleYearChange(currentYear - 1);
                } else {
                  handleMonthChange(currentMonth - 1);
                }
              }}
            />
            <select
              value={currentMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md bg-white font-medium"
            >
              {[
                "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
              ].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md bg-white font-medium w-28"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronRight
              className="w-5 h-5 cursor-pointer text-slate-600 hover:text-slate-900"
              onClick={() => {
                if (currentMonth === 12) {
                  handleMonthChange(1);
                  handleYearChange(currentYear + 1);
                } else {
                  handleMonthChange(currentMonth + 1);
                }
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Riepilogo Versamenti</TabsTrigger>
            <TabsTrigger value="expenses">Spese Ricorrenti</TabsTrigger>
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
                    {groupData?.memberQuotas.filter(m => m.confirmed).length || 0} saldo ok
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
                  <CardTitle className="text-lg">Quote Membri</CardTitle>
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
                        value={mq.calculated > 0 ? Math.min((mq.paid / mq.calculated) * 100, 100) : 0} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Versato: € {mq.paid.toFixed(2)}</span>
                        <Badge 
                          variant={mq.confirmed ? "default" : "secondary"} 
                          className={mq.confirmed ? "bg-green-500" : "bg-red-500 text-white"}
                        >
                          {mq.confirmed ? "Saldo OK" : "Da pagare"}
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
