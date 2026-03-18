"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Share2, Copy, RefreshCw, LinkIcon, QrCode, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareLinkSectionProps {
  groupId: string;
  currentToken?: string | null;
  isOwner: boolean;
}

export function ShareLinkSection({ groupId, currentToken, isOwner }: ShareLinkSectionProps) {
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : "https://webapp-famiglia.vercel.app";
  
  const viewUrl = currentToken ? `${baseUrl}/view/${currentToken}` : null;

  const handleRegenerate = async () => {
    if (!confirm("Sei sicuro? Il link precedente smetterà di funzionare.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/regenerate-token`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Link rigenerato con successo!");
        window.location.reload();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nella rigenerazione");
      }
    } catch (error) {
      toast.error("Errore di rete");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!viewUrl) return;

    try {
      await navigator.clipboard.writeText(viewUrl);
      setLinkCopied(true);
      toast.success("Link copiato negli appunti!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error("Errore nella copia");
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Link di Condivisione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Condividi questo link con i membri della famiglia per permettere loro di visualizzare 
            lo stato del gruppo senza accedere all&apos;app. Il link mostra una vista di sola lettura.
          </AlertDescription>
        </Alert>

        {viewUrl ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Link attuale</label>
              <div className="flex gap-2">
                <Input
                  value={viewUrl}
                  readOnly
                  className="font-mono text-sm bg-slate-50"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  disabled={!viewUrl}
                  className="shrink-0"
                >
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Rigenera Link
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-slate-500">Nessun link di condivisione generato</p>
            <Button onClick={handleRegenerate} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Genera Link di Condivisione
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
