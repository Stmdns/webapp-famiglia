"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";
import { ArrowLeft, Users, Receipt, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [groupData, setGroupData] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, month, year]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/payments?month=${month}&year=${year}`);
      if (res.ok) {
        setGroupData(await res.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = groupData 
    ? Object.entries(groupData.expensesByCategory || {}).map(([name, data]: [string, any]) => ({
        name,
        value: Math.round(data.total * 100) / 100,
        color: data.color,
      }))
    : [];

  const memberData = groupData?.memberQuotas?.map((mq: any) => ({
    name: mq.member.name,
    calcolato: Math.round(mq.calculated * 100) / 100,
    versato: Math.round(mq.paid * 100) / 100,
  })) || [];

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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/groups/${groupId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Report</h1>
                <p className="text-xs text-slate-500">Analisi dettagliata delle spese</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">Riepilogo</TabsTrigger>
            <TabsTrigger value="members">Per Membro</TabsTrigger>
            <TabsTrigger value="categories">Per Categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Totale Mensile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€ {groupData?.totalMonthly?.toFixed(2) || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Totale Versato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€ {groupData?.memberQuotas?.reduce((s: number, m: any) => s + m.paid, 0)?.toFixed(2) || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Membri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groupData?.memberQuotas?.length || 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calcolato vs Versato per Membro</CardTitle>
              </CardHeader>
              <CardContent>
                {memberData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={memberData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                      <Bar dataKey="calcolato" fill="#3b82f6" name="Calcolato" />
                      <Bar dataKey="versato" fill="#22c55e" name="Versato" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-slate-400">
                    Nessun dato disponibile
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dettaglio Membri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groupData?.memberQuotas?.map((mq: any) => (
                    <div key={mq.member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{mq.member.name}</p>
                        <p className="text-sm text-slate-500">Quota: {mq.member.quotaPercent}%</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm">
                          <span className="text-slate-500">Calcolato: </span>
                          <span className="font-medium">€ {mq.calculated.toFixed(2)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-slate-500">Versato: </span>
                          <span className="font-medium">€ {mq.paid.toFixed(2)}</span>
                        </p>
                        <Badge variant={mq.confirmed ? "default" : "secondary"} className={mq.confirmed ? "bg-green-500" : ""}>
                          {mq.confirmed ? "Confermato" : "In attesa"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Spese per Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
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
                    <div className="space-y-3">
                      {categoryData.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">€ {cat.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    Nessuna spesa configurata
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
