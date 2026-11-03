'use client'

import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { SMART_HUB_AUTOMATIONS, type SmartAutomation } from '../../lib/smart-hub-data'

const BADGE: Record<SmartAutomation['badgeTone'], string> = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-700',
}

export function SmartHubAutomations() {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      data-testid="smart-hub-automations"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Smart Hub — automações</h2>
          <p className="text-sm text-slate-500">Atalhos operacionais com hit target ≥44px</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SMART_HUB_AUTOMATIONS.map((item) => {
          const external = item.href.startsWith('http')
          const className =
            'group flex min-h-[96px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md'

          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <span
                  className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[10px] font-bold ${BADGE[item.badgeTone]}`}
                >
                  {item.badge}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.description}</p>
              <span className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-blue-600 group-hover:underline">
                Abrir
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </>
          )

          if (external) {
            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={item.testId}
                className={className}
              >
                {inner}
              </a>
            )
          }

          return (
            <Link key={item.id} href={item.href} data-testid={item.testId} className={className}>
              {inner}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
