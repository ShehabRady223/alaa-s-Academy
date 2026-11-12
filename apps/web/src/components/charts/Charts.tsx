import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AXIS = { fontSize: 12, fill: '#737373' };
const TIP = { contentStyle: { borderRadius: 6, border: '1px solid #e5e5e5', boxShadow: 'none', fontSize: 12 }, labelStyle: { color: '#171717', fontWeight: 500 } };

export interface Point { label: string; value: number; sub?: string }

export function ProgressLine({ data, height = 220, unit = '%' }: { data: Point[]; height?: number; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} tickLine={false} axisLine={false} unit={unit} />
        <Tooltip {...TIP} formatter={(v: number) => [`${v}${unit}`, 'Score']} labelFormatter={(l, p) => (p[0]?.payload as Point | undefined)?.sub ?? l} />
        <Line type="monotone" dataKey="value" stroke="#0f5c4a" strokeWidth={2} dot={{ r: 3, fill: '#0f5c4a' }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CountBars({ data, height = 200 }: { data: Point[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...TIP} cursor={{ fill: '#f5f5f5' }} formatter={(v: number) => [v, 'Attempts']} />
        <Bar dataKey="value" fill="#0f5c4a" radius={[3, 3, 0, 0]} maxBarSize={44} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
