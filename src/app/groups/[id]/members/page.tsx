"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users, Pencil } from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  quotaPercent: number;
}

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuota, setNewQuota] = useState(0);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editQuota, setEditQuota] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchMembers();
    }
  }, [status, router]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newQuota < 0) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, quotaPercent: newQuota }),
      });

      if (res.ok) {
        const member = await res.json();
        setMembers([...members, { ...member, groupId, userId: null }]);
        setAddDialogOpen(false);
        setNewName("");
        setNewQuota(0);
        toast.success("Membro aggiunto!");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setEditQuota(member.quotaPercent);
    setEditDialogOpen(true);
  };

  const updateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          memberId: editingMember.id, 
          name: editingMember.name, 
          quotaPercent: editQuota 
        }),
      });

      if (res.ok) {
        setMembers(members.map(m => 
          m.id === editingMember.id ? { ...m, quotaPercent: editQuota } : m
        ));
        setEditDialogOpen(false);
        setEditingMember(null);
        toast.success("Quota aggiornata!");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm("Sei sicuro di voler rimuovere questo membro?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members?memberId=${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMembers(members.filter(m => m.id !== memberId));
        toast.success("Membro rimosso");
      }
    } catch (error) {
      toast.error("Errore");
    }
  };

  const distributeEvenly = () => {
    if (members.length === 0) return;
    const evenQuota = Math.floor(100 / members.length);
    const remainder = 100 % members.length;
    
    const updatedMembers = members.map((m, i) => ({
      ...m,
      quotaPercent: i === 0 ? evenQuota + remainder : evenQuota
    }));
    
    setMembers(updatedMembers);
    
    updatedMembers.forEach(async (m) => {
      await fetch(`/api/groups/${groupId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          memberId: m.id, 
          name: m.name, 
          quotaPercent: m.quotaPercent 
        }),
      });
    });
    
    toast.success(`Quote distribuite equamente (${evenQuota}% ciascuno)`);
  };

  const totalQuota = members.reduce((sum, m) => sum + m.quotaPercent, 0);

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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Membri</h1>
                <p className="text-xs text-slate-500">Gestisci i membri e le quote</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {members.length > 0 && (
              <Button variant="outline" onClick={distributeEvenly}>
                Distribuisci equamente
              </Button>
            )}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi membro</DialogTitle>
                </DialogHeader>
                <form onSubmit={addMember} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      placeholder="Nome del membro"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quota (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="110"
                      value={newQuota}
                      onChange={(e) => setNewQuota(parseFloat(e.target.value))}
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Totale attuale: {totalQuota}%
                    </p>
                  </div>
                  <Button type="submit" className="w-full">Aggiungi</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica quota</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <form onSubmit={updateMember} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Quota per {editingMember.name} (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="110"
                    value={editQuota}
                    onChange={(e) => setEditQuota(parseFloat(e.target.value))}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Totale (senza questo membro): {totalQuota - editingMember.quotaPercent}%
                  </p>
                </div>
                <Button type="submit" className="w-full">Salva</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Quote Totali
              <Badge variant={totalQuota === 100 ? "default" : "secondary"} className={totalQuota === 100 ? "bg-green-500" : totalQuota > 100 ? "bg-red-500" : ""}>
                {totalQuota}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${totalQuota === 100 ? 'bg-green-500' : totalQuota > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(totalQuota, 100)}%` }}
              />
            </div>
            {totalQuota !== 100 && (
              <p className={`text-sm mt-2 ${totalQuota > 100 ? 'text-red-500' : 'text-amber-500'}`}>
                {totalQuota < 100 
                  ? `Mancano ${100 - totalQuota}% da assegnare` 
                  : `Superato del ${totalQuota - 100}%`}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-slate-600">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-slate-500">
                        {member.userId ? "Membro registrato" : "Membro senza account"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(member)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <div className="text-right">
                      <p className="font-bold text-lg">{member.quotaPercent}%</p>
                      <p className="text-xs text-slate-500">quota</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {members.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nessun membro oltre al proprietario</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
