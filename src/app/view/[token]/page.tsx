"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Users, 
  Euro, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock,
  Lock
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  ownerId: string;
  viewToken: string;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  quotaPercent: number;
  createdAt: string;
}

interface Balance extends Member {
  totalPaid: number;
  memberShare: number;
  balance: number;
}

interface RecurringExpense {
  id: string;
  groupId: string;
  categoryId: string | null;
  name: string;
  amount: number;
  frequencyType: string;
  frequencyValue: number;
  dayOfMonth: number | null;
  isActive: boolean;
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
  createdAt: string;
  updatedAt: string;
}

interface OneTimeExpense {
  id: string;
  groupId: string;
  expenseId: string | null;
  categoryId: string | null;
  name: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  isPaid: boolean;
  receiptText: string | null;
  createdAt: string;
}

export default function ViewGroupPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [groupData, setGroupData] = useState<{
    group: Group;
    members: Member[];
    balances: Balance[];
    recurringExpenses: RecurringExpense[];
    oneTimeExpenses: OneTimeExpense[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/view/${params.token}`);
        
        if (response.status === 404) {
          setError("Link di visualizzazione non valido");
          setLoading(false);
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
    };

    fetchData();
  }, [params.token]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Dati non disponibili</AlertTitle>
          <AlertDescription>Impossibile caricare i dati del gruppo</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { group, members, balances, recurringExpenses, oneTimeExpenses } = groupData;

  // Calcola il totale delle spese
  const totalRecurringAmount = recurringExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  
  const totalOneTimeAmount = oneTimeExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  
  const totalExpenses = totalRecurringAmount + totalOneTimeAmount;

  return (
    <div className="container py-8">
      {/* Banner di sola lettura */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Visualizzazione sola lettura</AlertTitle>
        <AlertDescription className="text-blue-700">
          Questa è una vista condivisa del gruppo. Nessuna modifica può essere apportata da questa pagina.
        </AlertDescription>
      </Alert>

      {/* Intestazione gruppo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <p className="text-muted-foreground">
          Gruppo familiare • Condiviso tramite link d'invito
        </p>
      </div>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              Persone nel gruppo
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Spese</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{totalExpenses.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Spese ricorrenti e una tantum
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilancio Totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{balances.reduce((sum, b) => sum + b.balance, 0).toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Bilancio aggregato del gruppo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Membri e bilanci */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Membri del Gruppo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balances.map((balance) => (
              <div key={balance.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <div className="font-medium">{balance.name}</div>
                  <Badge variant="secondary" className="ml-3">
                    {balance.quotaPercent}% quote
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    €{balance.totalPaid.toLocaleString("it-IT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className={`text-sm ${
                    balance.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {balance.balance >= 0 ? "In pari" : "Deve pagare"}{" "}
                    €{Math.abs(balance.balance).toLocaleString("it-IT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spese Ricorrenti */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Spese Ricorrenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recurringExpenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nessuna spesa ricorrente registrata
            </p>
          ) : (
            <div className="space-y-4">
              {recurringExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{expense.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.frequencyValue} {expense.frequencyType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      €{expense.amount.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <Badge variant={expense.isActive ? "default" : "secondary"}>
                      {expense.isActive ? "Attiva" : "Inattiva"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spese Una Tantum */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Spese Una Tantum
          </CardTitle>
        </CardHeader>
        <CardContent>
          {oneTimeExpenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nessuna spesa una tantum registrata
            </p>
          ) : (
            <div className="space-y-4">
              {oneTimeExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{expense.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString("it-IT")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      €{expense.amount.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <Badge variant={expense.isPaid ? "default" : "secondary"}>
                      {expense.isPaid ? "Pagata" : "Da pagare"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}