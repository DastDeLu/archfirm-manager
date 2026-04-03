import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
  Building2,
  FolderKanban,
  Receipt,
  Wallet,
  ArrowRight,
  Loader2
} from 'lucide-react';

const entityConfig = {
  Client: {
    icon: Building2,
    color: 'bg-blue-100 text-blue-700',
    buildUrl: (item) => createPageUrl(`Clients?clientId=${item.id}`),
  },
  Project: {
    icon: FolderKanban,
    color: 'bg-purple-100 text-purple-700',
    buildUrl: (item) => createPageUrl(`Projects?projectId=${item.id}`),
  },
  Fee: {
    icon: Receipt,
    color: 'bg-amber-100 text-amber-700',
    buildUrl: (item) => createPageUrl(`Fees?feeId=${item.id}`),
  },
  Revenue: {
    icon: Wallet,
    color: 'bg-emerald-100 text-emerald-700',
    buildUrl: (item) => createPageUrl(`Revenues?revenueId=${item.id}`),
  },
  Expense: {
    icon: Wallet,
    color: 'bg-red-100 text-red-700',
    buildUrl: (item) => createPageUrl(`Expenses?expenseId=${item.id}`),
  },
};

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({});
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const searchData = async () => {
      if (query.length < 2) {
        setResults({});
        return;
      }

      setLoading(true);
      try {
        const [clients, projects, fees, revenues, expenses] = await Promise.all([
          base44.entities.Client.list(),
          base44.entities.Project.list(),
          base44.entities.Fee.list(),
          base44.entities.Revenue.list(),
          base44.entities.Expense.list(),
        ]);

        const lowerQuery = query.toLowerCase();
        const filtered = {
          Client: clients.filter(c => c.name?.toLowerCase().includes(lowerQuery)).slice(0, 5),
          Project: projects.filter(p => p.name?.toLowerCase().includes(lowerQuery)).slice(0, 5),
          Fee: fees.filter(f => f.project_name?.toLowerCase().includes(lowerQuery) || f.client_name?.toLowerCase().includes(lowerQuery)).slice(0, 5),
          Revenue: revenues.filter(r => r.description?.toLowerCase().includes(lowerQuery)).slice(0, 5),
          Expense: expenses.filter(e => e.description?.toLowerCase().includes(lowerQuery)).slice(0, 5),
        };

        setResults(filtered);
        setSelectedIndex(0);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const flatResults = Object.entries(results).flatMap(([type, items]) =>
    items.map(item => ({ type, item }))
  );

  const handleSelect = (type, item) => {
    const config = entityConfig[type];
    if (config?.buildUrl) {
      navigate(config.buildUrl(item));
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      const { type, item } = flatResults[selectedIndex];
      handleSelect(type, item);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-slate-400 mr-3" />
          <Input
            placeholder="Cerca clienti, progetti, compensi..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 text-base py-4 px-0"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-slate-500">
              <Search className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Digita almeno 2 caratteri per cercare</p>
            </div>
          ) : flatResults.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Nessun risultato trovato per "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(results).map(([type, items]) => {
                if (items.length === 0) return null;
                const config = entityConfig[type];
                const Icon = config?.icon || Building2;

                return (
                  <div key={type}>
                    <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {type}s
                    </div>
                    {items.map((item) => {
                      const globalIdx = flatResults.findIndex(r => r.type === type && r.item.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(type, item)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${config?.color || 'bg-slate-100'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {item.name || item.project_name || item.description || 'Unnamed'}
                            </p>
                            {item.client_name && (
                              <p className="text-xs text-slate-500 truncate">{item.client_name}</p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white border text-[10px]">↑↓</kbd> Naviga</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white border text-[10px]">↵</kbd> Seleziona</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white border text-[10px]">Esc</kbd> Chiudi</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}