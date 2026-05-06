import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const chartData = [
  { name: "Mon", hours: 1.2, score: 72 },
  { name: "Tue", hours: 2.1, score: 78 },
  { name: "Wed", hours: 0.8, score: 81 },
  { name: "Thu", hours: 3.0, score: 85 },
  { name: "Fri", hours: 2.4, score: 88 },
  { name: "Sat", hours: 4.1, score: 91 },
  { name: "Sun", hours: 1.7, score: 89 },
];

const chartConfig = {
  hours: { label: "Flight Hours", color: "hsl(var(--primary))" },
  score: { label: "Oral Score", color: "hsl(var(--accent))" },
};

const Swatch = ({ name, varName }: { name: string; varName: string }) => (
  <div className="flex flex-col gap-1">
    <div
      className="h-12 w-full rounded-md border border-border"
      style={{ backgroundColor: `hsl(var(--${varName}))` }}
    />
    <span className="text-xs text-muted-foreground">{name}</span>
    <code className="text-[10px] text-muted-foreground">--{varName}</code>
  </div>
);

const ThemeQAPage = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Theme QA — SimPilot</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight">Theme QA</h1>
            <p className="text-sm text-muted-foreground">
              Active theme:{" "}
              <code className="text-primary">
                {mounted ? theme : "—"}
              </code>{" "}
              · resolved:{" "}
              <code className="text-primary">
                {mounted ? resolvedTheme : "—"}
              </code>
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto space-y-10 px-6 py-10">
        {/* Color tokens */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Color Tokens</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Background" varName="background" />
            <Swatch name="Foreground" varName="foreground" />
            <Swatch name="Card" varName="card" />
            <Swatch name="Primary" varName="primary" />
            <Swatch name="Secondary" varName="secondary" />
            <Swatch name="Muted" varName="muted" />
            <Swatch name="Accent" varName="accent" />
            <Swatch name="Destructive" varName="destructive" />
            <Swatch name="Border" varName="border" />
            <Swatch name="Input" varName="input" />
            <Swatch name="Ring" varName="ring" />
            <Swatch name="Popover" varName="popover" />
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Cards</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Standard Card</CardTitle>
                <CardDescription>Uses semantic tokens.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Body text rendered with muted foreground for secondary
                  emphasis.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Primary action</Button>
              </CardFooter>
            </Card>

            <Card className="bento bento-hover">
              <CardHeader>
                <CardTitle>Bento Card</CardTitle>
                <CardDescription>With glow on hover.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Hover to verify cyan border glow remains correct in both
                  themes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Inputs</CardTitle>
                <CardDescription>Inputs &amp; labels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qa-callsign">Callsign</Label>
                  <Input id="qa-callsign" placeholder="N12345" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qa-disabled">Disabled</Label>
                  <Input id="qa-disabled" disabled value="Read only" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Alerts */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Alerts</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Alert>
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                Default alert variant — verify legibility on both themes.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Destructive variant should remain readable.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Tabs</h2>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm text-muted-foreground">
              Overview content.
            </TabsContent>
            <TabsContent value="metrics" className="text-sm text-muted-foreground">
              Metrics content.
            </TabsContent>
            <TabsContent value="logs" className="text-sm text-muted-foreground">
              Logs content.
            </TabsContent>
          </Tabs>
        </section>

        {/* Table */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Table</h2>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableCaption>Recent training sessions</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>Oral Exam Prep</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.score}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.hours.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Charts */}
        <section className="space-y-4">
          <h2 className="font-display text-xl">Charts</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bar Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Line Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-score)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-3">
          <h2 className="font-display text-xl">Typography</h2>
          <h1 className="font-display text-4xl">H1 Heading</h1>
          <h2 className="font-display text-3xl">H2 Heading</h2>
          <h3 className="font-display text-2xl">H3 Heading</h3>
          <p className="max-w-2xl text-base">
            Paragraph body copy. The quick brown fox jumps over the lazy dog.
            All headings should render at normal weight per project rules.
          </p>
          <p className="text-sm text-muted-foreground">
            Muted secondary text for captions and metadata.
          </p>
          <a href="#" className="text-primary underline">
            Primary link
          </a>
        </section>
      </main>
    </div>
  );
};

export default ThemeQAPage;
