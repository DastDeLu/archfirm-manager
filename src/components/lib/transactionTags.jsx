// ─── Costanti Tag ───────────────────────────────────────────────────────────
export const TAG_SPONSORIZZATE = 'Sponsorizzate';
export const TAG_COMPENSI = 'Compensi';

// ─── Tag Spese ───────────────────────────────────────────────────────────────
export const EXPENSE_TAGS = [
  'Acquisti materie prime',
  'Costi Produttivi',
  'Costi del Personale',
  'Costi Generali',
  'Costi Amministrativi',
  'Mutui e Prestiti',
  'Oneri Tributari',
  TAG_SPONSORIZZATE,
  TAG_COMPENSI,
];

export const EXPENSE_TAG_COLORS = {
  'Acquisti materie prime': 'bg-amber-100 text-amber-700',
  'Costi Produttivi': 'bg-orange-100 text-orange-700',
  'Costi del Personale': 'bg-emerald-100 text-emerald-700',
  'Costi Generali': 'bg-blue-100 text-blue-700',
  'Costi Amministrativi': 'bg-purple-100 text-purple-700',
  'Mutui e Prestiti': 'bg-red-100 text-red-700',
  'Oneri Tributari': 'bg-rose-100 text-rose-700',
  [TAG_SPONSORIZZATE]: 'bg-cyan-100 text-cyan-700',
  [TAG_COMPENSI]: 'bg-indigo-100 text-indigo-700',
};

// ─── Tag Ricavi ───────────────────────────────────────────────────────────────
export const REVENUE_TAGS = [
  'Progettazione',
  'Direzione Lavori',
  'Provvigione',
  'Burocrazia',
  TAG_COMPENSI,
  'Other',
];

export const REVENUE_TAG_COLORS = {
  'Progettazione': 'bg-purple-100 text-purple-700',
  'Direzione Lavori': 'bg-blue-100 text-blue-700',
  'Provvigione': 'bg-emerald-100 text-emerald-700',
  'Burocrazia': 'bg-amber-100 text-amber-700',
  [TAG_COMPENSI]: 'bg-indigo-100 text-indigo-700',
  'Other': 'bg-slate-100 text-slate-700',
};