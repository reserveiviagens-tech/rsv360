import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LifecycleFunnel({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          Lifecycle funnel
          <span className="rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
            Demo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <p className="mb-2 text-xs text-amber-900">Funil ilustrativo — valores hardcoded, não métricas CRM ao vivo.</p>
        <ResponsiveContainer width="100%" height="90%">
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={data} isAnimationActive>
              <LabelList position="right" fill="#334155" dataKey="name" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
