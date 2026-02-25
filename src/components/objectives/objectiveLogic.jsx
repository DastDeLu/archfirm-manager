/**
 * Calcola lo stato del semaforo per un obiettivo
 * @param {Object} objective - L'oggetto obiettivo
 * @returns {Object} - { status: 'on_track' | 'at_risk' | 'off_track', percentage: number, message: string }
 */
export function calculateObjectiveStatus(objective) {
  const { 
    current_value = 0, 
    target_value, 
    success_logic, 
    deadline 
  } = objective;

  // Calcola la percentuale di completamento
  let percentage = 0;
  if (target_value !== 0) {
    if (success_logic === 'higher_better') {
      percentage = (current_value / target_value) * 100;
    } else {
      // Per "lower is better", la percentuale è invertita
      // Se il valore corrente è inferiore al target, è buono
      percentage = target_value > 0 
        ? Math.max(0, (1 - (current_value / target_value)) * 100)
        : 0;
    }
  }

  // Calcola il tempo rimanente
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const totalTime = deadlineDate - new Date(objective.created_date || now);
  const timeRemaining = deadlineDate - now;
  const timeElapsedPercentage = totalTime > 0 
    ? ((totalTime - timeRemaining) / totalTime) * 100 
    : 100;

  // Determina lo stato in base al progresso vs tempo trascorso
  let status = 'on_track';
  let message = '';

  if (percentage >= 100) {
    status = 'on_track';
    message = 'Obiettivo raggiunto! 🎉';
  } else if (percentage >= timeElapsedPercentage) {
    status = 'on_track';
    message = 'In linea con le aspettative';
  } else if (percentage >= timeElapsedPercentage - 20) {
    status = 'at_risk';
    message = 'Attenzione: leggero ritardo';
  } else {
    status = 'off_track';
    message = 'Fuori rotta: intervento necessario';
  }

  // Se la deadline è superata e non è completato
  if (now > deadlineDate && percentage < 100) {
    status = 'off_track';
    message = 'Scaduto';
  }

  return {
    status,
    percentage: Math.min(percentage, 100),
    timeElapsedPercentage,
    message
  };
}

/**
 * Formatta il valore in base al tipo di unità
 */
export function formatValue(value, unitType) {
  if (value === null || value === undefined) return '-';
  
  switch (unitType) {
    case 'currency':
      return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
      return value.toLocaleString('it-IT');
    default:
      return value.toString();
  }
}

/**
 * Ottiene il colore del semaforo in base allo stato
 */
export function getStatusColor(status) {
  switch (status) {
    case 'on_track':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        icon: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-700'
      };
    case 'at_risk':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700'
      };
    case 'off_track':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-700'
      };
    default:
      return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        icon: 'text-slate-600',
        badge: 'bg-slate-100 text-slate-700'
      };
  }
}

/**
 * Ottiene l'icona del semaforo
 */
export function getStatusIcon(status) {
  switch (status) {
    case 'on_track':
      return '🟢';
    case 'at_risk':
      return '🟡';
    case 'off_track':
      return '🔴';
    default:
      return '⚪';
  }
}