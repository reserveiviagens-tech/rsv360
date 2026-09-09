/**
 * Classify host reservations for the Hoje / Próximos dashboard.
 */

export type ReservaAgendaItem = {
  propostaId: number;
  checkIn: string;
  checkOut: string;
  titulo?: string | null;
  clienteNome?: string | null;
  status?: string | null;
  acomodacaoId?: number;
  valorTotal?: string | null;
};

export type HojeBuckets = {
  checkIns: ReservaAgendaItem[];
  checkOuts: ReservaAgendaItem[];
  hospedados: ReservaAgendaItem[];
  proximos: ReservaAgendaItem[];
};

function ymd(s: string): string {
  return String(s).slice(0, 10);
}

/** Compare YYYY-MM-DD lexicographically. */
export function classificarReservasHoje(
  items: ReservaAgendaItem[],
  hoje: string,
  proximosAte: string,
): HojeBuckets {
  const day = ymd(hoje);
  const lim = ymd(proximosAte);
  const checkIns: ReservaAgendaItem[] = [];
  const checkOuts: ReservaAgendaItem[] = [];
  const hospedados: ReservaAgendaItem[] = [];
  const proximos: ReservaAgendaItem[] = [];

  for (const r of items) {
    const ci = ymd(r.checkIn);
    const co = ymd(r.checkOut);
    if (ci === day) checkIns.push(r);
    if (co === day) checkOuts.push(r);
    if (ci < day && co > day) hospedados.push(r);
    if (ci > day && ci <= lim) proximos.push(r);
  }

  const byCheckIn = (a: ReservaAgendaItem, b: ReservaAgendaItem) =>
    ymd(a.checkIn).localeCompare(ymd(b.checkIn));
  proximos.sort(byCheckIn);
  checkIns.sort(byCheckIn);
  checkOuts.sort(byCheckIn);

  return { checkIns, checkOuts, hospedados, proximos };
}
