import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from './BudgetService';

const BudgetContext = createContext();

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget deve essere usato all\'interno di BudgetProvider');
  }
  return context;
};

export const BudgetProvider = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch categorie
  const { data: categorie = [], isLoading: loadingCategorie } = useQuery({
    queryKey: ['categorieSpesa'],
    queryFn: () => base44.entities.CategoriaSpesa.list('ordine'),
  });

  // Fetch voci di spesa
  const { data: vociSpesa = [], isLoading: loadingVoci } = useQuery({
    queryKey: ['vociSpesa'],
    queryFn: () => base44.entities.VoceSpesa.list('-data_aggiornamento'),
  });

  // Fetch tutte le spese per calcolare speso_reale in tempo reale
  const { data: tutteLeSpese = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  // Calcola speso_reale per ogni voce direttamente dalle spese collegate
  const spesoPerVoce = React.useMemo(() => {
    const map = {};
    tutteLeSpese.forEach(spesa => {
      if (spesa.id_voce_spesa) {
        map[spesa.id_voce_spesa] = (map[spesa.id_voce_spesa] || 0) + (spesa.amount || 0);
      }
    });
    return map;
  }, [tutteLeSpese]);

  // Voci arricchite con speso_reale e residuo calcolati live
  const vociSpesaLive = React.useMemo(() => {
    return vociSpesa.map(voce => {
      const spesoReale = spesoPerVoce[voce.id] || 0;
      return {
        ...voce,
        speso_reale: spesoReale,
        residuo: voce.budget_totale - spesoReale,
      };
    });
  }, [vociSpesa, spesoPerVoce]);

  // Raggruppa voci per categoria
  const vociPerCategoria = React.useMemo(() => {
    const grouped = {};
    categorie.forEach(cat => {
      grouped[cat.id] = vociSpesaLive.filter(voce => voce.id_categoria === cat.id);
    });
    return grouped;
  }, [categorie, vociSpesaLive]);

  // Calcola statistiche per categoria
  const statistichePerCategoria = React.useMemo(() => {
    const stats = {};
    categorie.forEach(cat => {
      stats[cat.id] = BudgetService.calcolaStatisticheCategoria(cat.id, vociSpesaLive);
    });
    return stats;
  }, [categorie, vociSpesaLive]);

  /**
   * Registra un pagamento e aggiorna il budget
   */
  const aggiornaBudget = async (spesa) => {
    try {
      if (!spesa.id_voce_spesa || spesa.stato !== 'Pagato') {
        return null;
      }

      const risultato = await BudgetService.registraPagamento(
        spesa.id,
        spesa.importo || spesa.amount,
        spesa.id_voce_spesa
      );

      // Aggiorna le query
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      
      return risultato;
    } catch (error) {
      console.error('Errore nell\'aggiornamento del budget:', error);
      throw error;
    }
  };

  /**
   * Annulla un pagamento
   */
  const annullaPagamento = async (importo, idVoceSpesa) => {
    try {
      const risultato = await BudgetService.annullaPagamento(importo, idVoceSpesa);
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      return risultato;
    } catch (error) {
      console.error('Errore nell\'annullamento del pagamento:', error);
      throw error;
    }
  };

  /**
   * Aggiorna il budget totale di una voce
   */
  const aggiornaBudgetTotale = async (idVoceSpesa, nuovoBudget) => {
    try {
      const risultato = await BudgetService.aggiornaBudgetTotale(idVoceSpesa, nuovoBudget);
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      return risultato;
    } catch (error) {
      console.error('Errore nell\'aggiornamento del budget totale:', error);
      throw error;
    }
  };

  const value = {
    categorie,
    vociSpesa: vociSpesaLive,
    vociPerCategoria,
    statistichePerCategoria,
    aggiornaBudget,
    annullaPagamento,
    aggiornaBudgetTotale,
    loading: loadingCategorie || loadingVoci
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};