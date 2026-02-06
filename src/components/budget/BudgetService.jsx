import { base44 } from '@/api/base44Client';

/**
 * BudgetService - Gestisce la logica di calcolo del budget countdown
 */
export const BudgetService = {
  /**
   * Registra un pagamento e aggiorna il budget della voce di spesa
   * @param {string} spesaId - ID della spesa
   * @param {number} importo - Importo pagato
   * @param {string} idVoceSpesa - ID della voce di spesa da aggiornare
   */
  async registraPagamento(spesaId, importo, idVoceSpesa) {
    try {
      if (!idVoceSpesa) {
        console.log('Spesa non collegata a una voce di budget');
        return null;
      }

      // Fetch la voce di spesa corrente
      const vociSpesa = await base44.entities.VoceSpesa.filter({ id: idVoceSpesa });
      const voceSpesa = vociSpesa[0];

      if (!voceSpesa) {
        throw new Error('Voce di spesa non trovata');
      }

      // Calcola i nuovi valori
      const nuovoSpesoReale = (voceSpesa.speso_reale || 0) + importo;
      const nuovoResiduo = voceSpesa.budget_totale - nuovoSpesoReale;

      // Aggiorna la voce di spesa
      const voceAggiornata = await base44.entities.VoceSpesa.update(idVoceSpesa, {
        speso_reale: nuovoSpesoReale,
        residuo: nuovoResiduo,
        data_aggiornamento: new Date().toISOString()
      });

      return {
        voceAggiornata,
        overbudget: nuovoResiduo < 0,
        percentualeUtilizzo: (nuovoSpesoReale / voceSpesa.budget_totale) * 100
      };
    } catch (error) {
      console.error('Errore durante la registrazione del pagamento:', error);
      throw error;
    }
  },

  /**
   * Annulla un pagamento e ripristina il budget
   * @param {number} importo - Importo da sottrarre
   * @param {string} idVoceSpesa - ID della voce di spesa
   */
  async annullaPagamento(importo, idVoceSpesa) {
    try {
      if (!idVoceSpesa) return null;

      const vociSpesa = await base44.entities.VoceSpesa.filter({ id: idVoceSpesa });
      const voceSpesa = vociSpesa[0];

      if (!voceSpesa) {
        throw new Error('Voce di spesa non trovata');
      }

      const nuovoSpesoReale = Math.max(0, (voceSpesa.speso_reale || 0) - importo);
      const nuovoResiduo = voceSpesa.budget_totale - nuovoSpesoReale;

      const voceAggiornata = await base44.entities.VoceSpesa.update(idVoceSpesa, {
        speso_reale: nuovoSpesoReale,
        residuo: nuovoResiduo,
        data_aggiornamento: new Date().toISOString()
      });

      return voceAggiornata;
    } catch (error) {
      console.error('Errore durante l\'annullamento del pagamento:', error);
      throw error;
    }
  },

  /**
   * Aggiorna il budget totale di una voce
   * @param {string} idVoceSpesa - ID della voce di spesa
   * @param {number} nuovoBudget - Nuovo budget totale
   */
  async aggiornaBudgetTotale(idVoceSpesa, nuovoBudget) {
    try {
      const vociSpesa = await base44.entities.VoceSpesa.filter({ id: idVoceSpesa });
      const voceSpesa = vociSpesa[0];

      if (!voceSpesa) {
        throw new Error('Voce di spesa non trovata');
      }

      const nuovoResiduo = nuovoBudget - (voceSpesa.speso_reale || 0);

      const voceAggiornata = await base44.entities.VoceSpesa.update(idVoceSpesa, {
        budget_totale: nuovoBudget,
        residuo: nuovoResiduo,
        data_aggiornamento: new Date().toISOString()
      });

      return voceAggiornata;
    } catch (error) {
      console.error('Errore durante l\'aggiornamento del budget:', error);
      throw error;
    }
  },

  /**
   * Calcola statistiche aggregate per categoria
   * @param {string} idCategoria - ID della categoria
   * @param {Array} vociSpesa - Array di voci di spesa della categoria
   */
  calcolaStatisticheCategoria(idCategoria, vociSpesa) {
    const vociCategoria = vociSpesa.filter(v => v.id_categoria === idCategoria);
    
    const totBudget = vociCategoria.reduce((sum, v) => sum + (v.budget_totale || 0), 0);
    const totSpeso = vociCategoria.reduce((sum, v) => sum + (v.speso_reale || 0), 0);
    const totResiduo = vociCategoria.reduce((sum, v) => sum + (v.residuo || 0), 0);
    
    return {
      budgetTotale: totBudget,
      spesoTotale: totSpeso,
      residuoTotale: totResiduo,
      percentualeUtilizzo: totBudget > 0 ? (totSpeso / totBudget) * 100 : 0,
      numeroVoci: vociCategoria.length
    };
  }
};