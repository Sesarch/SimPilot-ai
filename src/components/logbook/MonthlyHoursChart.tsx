import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";

type Entry = {
  flight_date: string;
  total_time: number;
  night_time: number;
  status: string;
  source: string;
};

interface Props {
  logs: Entry[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// G3000 palette
const AMBER = "hsl(45 95% 58%)";   // Radio Practice
const GREEN = "hsl(var(--hud-green))"; // Study / Manual time
const WHITE = "hsl(0 0% 95%)";

const MonthlyHoursChart = ({ logs }: Props) => {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; radio: number; study: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        radio: 0,
        study: 0,
      });
    }
    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const l of logs) {
      if (l.status !== "final") continue;
      const d = new Date(l.flight_date + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = map.get(key);
      if (!b) continue;
      const hr = Number(l.total_time) || 0;
      if (l.source === "atc_session") b.radio += hr;
      else b.study += hr;
    }
    return buckets.map((b) => ({
      ...b,
      radio: +b.radio.toFixed(1),
      study: +b.study.toFixed(1),
    }));
  }, [logs]);

  const totals = useMemo(() => {
    const radio = data.reduce((a, b) => a + b.radio, 0);
    const study = data.reduce((a, b) => a + b.study, 0);
    return { radio, study, total: radio + study };
  }, [data]);

  return (
    <div className="g3000-bezel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="font-display text-[11px] tracking-[0.25em] uppercase text-foreground">
            Monthly Training Hours
          </div>
          <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5">
            Last 12 Months · Stacked: Radio Practice + Exam Study
          </div>
        </div>
        <div className="flex items-end gap-4 text-right">
          <div>
            <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">Radio</div>
            <div className="font-display text-lg tabular-nums" style={{ color: AMBER, textShadow: `0 0 6px ${AMBER}88` }}>
              {totals.radio.toFixed(1)}<span className="text-[9px] ml-0.5 text-muted-foreground">hr</span>
            </div>
          </div>
          <div>
            <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">Study</div>
            <div className="font-display text-lg tabular-nums" style={{ color: GREEN, textShadow: `0 0 6px ${GREEN} / 0.5` }}>
              {totals.study.toFixed(1)}<span className="text-[9px] ml-0.5 text-muted-foreground">hr</span>
            </div>
          </div>
          <div>
            <div className="font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">12-Mo Total</div>
            <div className="font-display text-2xl tabular-nums" style={{ color: WHITE }}>
              {totals.total.toFixed(1)}<span className="text-[10px] ml-0.5 text-muted-foreground">hr</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
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
                fontSize: 11,
                boxShadow: `0 0 12px ${AMBER}44`,
              }}
              labelStyle={{ color: AMBER, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 10 }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v: number, name: string) => [`${(v as number).toFixed(1)} hr`, name === "radio" ? "Radio Practice" : "Exam Study"]}
            />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", paddingTop: 4 }}
              formatter={(v) => (v === "radio" ? "Radio Practice" : "Exam Study")}
            />
            <Bar dataKey="radio" stackId="a" fill={AMBER} fillOpacity={0.85} radius={[0, 0, 0, 0]} />
            <Bar dataKey="study" stackId="a" fill={GREEN} fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyHoursChart;
