import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

type Entry = { flight_date: string; total_time: number; night_time: number; status: string };

interface Props {
  logs: Entry[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// G3000 palette
const AMBER = "hsl(45 95% 58%)";
const GREEN = "hsl(var(--hud-green))";

const MonthlyHoursChart = ({ logs }: Props) => {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; hours: number; night: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        hours: 0,
        night: 0,
      });
    }
    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const l of logs) {
      if (l.status !== "final") continue;
      const d = new Date(l.flight_date + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = map.get(key);
      if (!b) continue;
      b.hours += Number(l.total_time) || 0;
      b.night += Number(l.night_time) || 0;
    }
    return buckets.map((b) => ({ ...b, hours: +b.hours.toFixed(1), night: +b.night.toFixed(1) }));
  }, [logs]);

  const totalYear = useMemo(() => data.reduce((a, b) => a + b.hours, 0), [data]);

  return (
    <div className="g3000-bezel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="font-display text-[11px] tracking-[0.25em] uppercase text-foreground">
            Monthly Flight Hours
          </div>
          <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5">
            Last 12 Months · Amber = Total · Green = Night Portion
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">12-Mo Total</div>
          <div
            className="font-display text-2xl font-bold tabular-nums"
            style={{ color: AMBER, textShadow: `0 0 8px ${AMBER}99` }}
          >
            {totalYear.toFixed(1)}
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground ml-1">hr</span>
          </div>
        </div>
      </div>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-display, inherit)" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: `${AMBER}10` }}
              contentStyle={{
                background: "hsl(var(--background))",
                border: `1px solid ${AMBER}66`,
                borderRadius: 4,
                fontFamily: "inherit",
                fontSize: 11,
                boxShadow: `0 0 12px ${AMBER}44`,
              }}
              labelStyle={{ color: AMBER, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 10 }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v: number, name: string) => [`${v.toFixed(1)} hr`, name === "hours" ? "Total" : "Night"]}
            />
            <Bar dataKey="hours" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.night > 0 && d.night >= d.hours * 0.5 ? GREEN : AMBER} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyHoursChart;
