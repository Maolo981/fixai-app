import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationSettingsProps {
  userId: string | undefined;
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const { permission, requestPermission } = useNotifications(userId);

  const getStatusBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge className="bg-green-500">Attive</Badge>;
      case "denied":
        return <Badge variant="destructive">Bloccate</Badge>;
      default:
        return <Badge variant="outline">Non configurate</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifiche Push</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Ricevi notifiche per aggiornamenti importanti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Aggiornamenti stato lavori</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Nuovi preventivi ricevuti</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Nuovi messaggi in chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Tecnico in arrivo (GPS tracking)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Promemoria appuntamenti (24h e 2h prima)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Richieste recensione post-lavoro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Offerte speciali personalizzate</span>
          </div>
        </div>

        {permission !== "granted" && (
          <Button
            onClick={requestPermission}
            className="w-full"
            disabled={permission === "denied"}
          >
            {permission === "denied" ? (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Notifiche Bloccate
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Attiva Notifiche
              </>
            )}
          </Button>
        )}

        {permission === "denied" && (
          <p className="text-xs text-muted-foreground">
            Per attivare le notifiche, vai nelle impostazioni del browser e
            consenti le notifiche per questo sito.
          </p>
        )}

        {permission === "granted" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Le notifiche sono attive
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
