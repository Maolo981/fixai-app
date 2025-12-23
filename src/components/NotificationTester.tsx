import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellRing, CheckCircle, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationTesterProps {
  userId?: string;
}

export function NotificationTester({ userId }: NotificationTesterProps) {
  const { isSupported, permission, requestPermission, sendNotification } = usePushNotifications(userId);
  const [testSent, setTestSent] = useState(false);

  const handleSendTest = () => {
    sendNotification("🔔 Notifica di Test", {
      body: "Le notifiche push funzionano correttamente!",
      tag: "test-notification",
      requireInteraction: true,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const getStatusIcon = () => {
    if (!isSupported) return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (permission === "granted") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (permission === "denied") return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <Bell className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!isSupported) return "Non supportato";
    if (permission === "granted") return "Attive";
    if (permission === "denied") return "Bloccate";
    return "Non attive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Test Notifiche Push
        </CardTitle>
        <CardDescription>
          Verifica che le notifiche funzionino correttamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Stato notifiche:</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
        </div>

        {!isSupported && (
          <p className="text-sm text-muted-foreground">
            Il tuo browser non supporta le notifiche push.
          </p>
        )}

        {isSupported && permission === "default" && (
          <Button onClick={requestPermission} className="w-full">
            <Bell className="mr-2 h-4 w-4" />
            Attiva Notifiche
          </Button>
        )}

        {isSupported && permission === "denied" && (
          <p className="text-sm text-muted-foreground">
            Le notifiche sono bloccate. Abilita dalle impostazioni del browser.
          </p>
        )}

        {isSupported && permission === "granted" && (
          <Button 
            onClick={handleSendTest} 
            className="w-full"
            variant={testSent ? "secondary" : "default"}
          >
            {testSent ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Notifica Inviata!
              </>
            ) : (
              <>
                <BellRing className="mr-2 h-4 w-4" />
                Invia Notifica di Test
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
