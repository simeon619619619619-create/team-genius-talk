import { useState } from "react";
import { AppHealthCheck } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";

interface AppHealthTabProps {
  healthChecks: AppHealthCheck[];
  onRunCheck: () => Promise<AppHealthCheck>;
}

const statusIcon = {
  ok: <CheckCircle className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusColor = {
  ok: "bg-green-500/10 text-green-600 border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function AppHealthTab({ healthChecks, onRunCheck }: AppHealthTabProps) {
  const [running, setRunning] = useState(false);

  const handleCheck = async () => {
    setRunning(true);
    await onRunCheck();
    setRunning(false);
  };

  const latestCheck = healthChecks[0];

  const overallStatus = latestCheck?.checks.some(c => c.status === "error")
    ? "error"
    : latestCheck?.checks.some(c => c.status === "warning")
      ? "warning"
      : "ok";

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">App Health Monitor</h3>
            <p className="text-sm text-muted-foreground">
              {latestCheck
                ? `Последна проверка: ${format(new Date(latestCheck.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: bg })}`
                : "Няма проведени проверки"}
            </p>
          </div>
        </div>
        <Button onClick={handleCheck} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Проверява..." : "Провери сега"}
        </Button>
      </div>

      {/* Overall status */}
      {latestCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {statusIcon[overallStatus]}
              <span>
                Обща оценка: {overallStatus === "ok" ? "Всичко е наред" : overallStatus === "warning" ? "Има предупреждения" : "Има проблеми"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {latestCheck.checks.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    check.status === "error"
                      ? "border-red-500/20 bg-red-500/5"
                      : check.status === "warning"
                        ? "border-yellow-500/20 bg-yellow-500/5"
                        : "border-green-500/20 bg-green-500/5"
                  }`}
                >
                  {statusIcon[check.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{check.name}</p>
                      <Badge variant="outline" className={statusColor[check.status]}>
                        {check.status === "ok" ? "OK" : check.status === "warning" ? "Warning" : "Error"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground mt-1 break-all">{check.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {healthChecks.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              История на проверките
            </CardTitle>
            <CardDescription>Последните {healthChecks.length} проверки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthChecks.map((check, i) => {
                const status = check.checks.some(c => c.status === "error")
                  ? "error"
                  : check.checks.some(c => c.status === "warning")
                    ? "warning"
                    : "ok";
                const errorCount = check.checks.filter(c => c.status === "error").length;
                const warnCount = check.checks.filter(c => c.status === "warning").length;

                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
                    {statusIcon[status]}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(new Date(check.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: bg })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {check.checks.length} проверки
                        {errorCount > 0 && ` / ${errorCount} грешки`}
                        {warnCount > 0 && ` / ${warnCount} предупреждения`}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColor[status]}>
                      {status === "ok" ? "OK" : status === "warning" ? "Warning" : "Error"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No checks yet */}
      {healthChecks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Натиснете "Провери сега" за да стартирате първата проверка
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
