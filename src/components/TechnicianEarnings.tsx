import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Euro,
  TrendingUp,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";

interface TechnicianEarningsProps {
  technicianId: string;
}

interface EarningsData {
  month: string;
  earnings: number;
  jobs: number;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  job_id: string;
}

interface JobStats {
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}

export function TechnicianEarnings({ technicianId }: TechnicianEarningsProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyEarnings, setMonthlyEarnings] = useState<EarningsData[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [jobStats, setJobStats] = useState<JobStats>({
    completed: 0,
    inProgress: 0,
    pending: 0,
    cancelled: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [earningsChange, setEarningsChange] = useState(0);

  useEffect(() => {
    if (technicianId) {
      loadEarningsData();
    }
  }, [technicianId]);

  const loadEarningsData = async () => {
    setLoading(true);
    
    try {
      // Load all jobs for this technician
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, status, final_cost, completion_date, created_at")
        .eq("technician_id", technicianId);

      if (jobs) {
        // Calculate job stats
        const stats: JobStats = {
          completed: jobs.filter(j => j.status === "completed").length,
          inProgress: jobs.filter(j => j.status === "in_progress").length,
          pending: jobs.filter(j => j.status === "requested" || j.status === "confirmed").length,
          cancelled: jobs.filter(j => j.status === "cancelled").length,
        };
        setJobStats(stats);

        // Calculate total earnings from completed jobs
        const completedJobs = jobs.filter(j => j.status === "completed" && j.final_cost);
        const total = completedJobs.reduce((sum, j) => sum + (j.final_cost || 0), 0);
        setTotalEarnings(total);

        // Calculate monthly earnings for the last 6 months
        const monthlyData: EarningsData[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));
          
          const monthJobs = completedJobs.filter(j => {
            const completionDate = j.completion_date ? new Date(j.completion_date) : null;
            return completionDate && completionDate >= monthStart && completionDate <= monthEnd;
          });

          monthlyData.push({
            month: format(monthStart, "MMM", { locale: it }),
            earnings: monthJobs.reduce((sum, j) => sum + (j.final_cost || 0), 0),
            jobs: monthJobs.length,
          });
        }
        setMonthlyEarnings(monthlyData);

        // Current month earnings
        const currentMonth = monthlyData[monthlyData.length - 1]?.earnings || 0;
        const previousMonth = monthlyData[monthlyData.length - 2]?.earnings || 0;
        setMonthEarnings(currentMonth);
        
        // Calculate percentage change
        if (previousMonth > 0) {
          setEarningsChange(((currentMonth - previousMonth) / previousMonth) * 100);
        } else if (currentMonth > 0) {
          setEarningsChange(100);
        }
      }

      // Load payments for pending amount
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .in("job_id", jobs?.map(j => j.id) || [])
        .order("created_at", { ascending: false });

      if (payments) {
        const pending = payments
          .filter(p => p.status === "pending")
          .reduce((sum, p) => sum + p.amount, 0);
        setPendingPayments(pending);
        setRecentPayments(payments.slice(0, 5));
      }

    } catch (error) {
      console.error("Error loading earnings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--muted))", "hsl(var(--destructive))"];

  const pieData = [
    { name: "Completati", value: jobStats.completed, color: "hsl(142.1 76.2% 36.3%)" },
    { name: "In Corso", value: jobStats.inProgress, color: "hsl(var(--primary))" },
    { name: "In Attesa", value: jobStats.pending, color: "hsl(var(--secondary))" },
    { name: "Annullati", value: jobStats.cancelled, color: "hsl(var(--destructive))" },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <Euro className="h-5 w-5 text-primary" />
              {earningsChange !== 0 && (
                <div className={`flex items-center text-xs ${earningsChange > 0 ? "text-green-600" : "text-red-600"}`}>
                  {earningsChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(earningsChange).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold">€{monthEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Questo mese</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div className="mt-2">
              <div className="text-xl font-bold">€{totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Totale guadagni</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div className="mt-2">
              <div className="text-xl font-bold">{jobStats.completed}</div>
              <p className="text-xs text-muted-foreground">Lavori completati</p>
            </div>
          </CardContent>
        </Card>

        <Card className={pendingPayments > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardContent className="pt-4 pb-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div className="mt-2">
              <div className="text-xl font-bold">€{pendingPayments.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Pagamenti in sospeso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Andamento Guadagni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEarnings}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => `€${value}`}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Guadagni"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Jobs per Month Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lavori per Mese</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEarnings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, "Lavori"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Job Distribution */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuzione Lavori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ultimi Pagamenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    €{payment.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), "d MMM yyyy", { locale: it })}
                  </p>
                </div>
                <Badge
                  variant={
                    payment.status === "succeeded"
                      ? "default"
                      : payment.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {payment.status === "succeeded"
                    ? "Completato"
                    : payment.status === "pending"
                    ? "In attesa"
                    : payment.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
