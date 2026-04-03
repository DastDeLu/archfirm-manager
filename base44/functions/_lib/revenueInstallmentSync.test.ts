import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildRevenueDescription,
  normalizeAmount,
  recomputeFeePaymentStatus,
  toInstallmentPaymentMethod,
  toRevenuePaymentMethod,
} from './revenueInstallmentSync.ts';

Deno.test('buildRevenueDescription keeps installment/fee context aligned', () => {
  const description = buildRevenueDescription(
    { installment_number: 3 },
    { project_name: 'Villa Lago' },
  );
  assertEquals(description, 'Incasso rata 3 - Villa Lago');
});

Deno.test('payment method mappers keep bank/cash compatibility', () => {
  assertEquals(toRevenuePaymentMethod('cash'), 'cash');
  assertEquals(toRevenuePaymentMethod('bank'), 'bank_transfer');
  assertEquals(toInstallmentPaymentMethod('cash'), 'cash');
  assertEquals(toInstallmentPaymentMethod('bank_transfer'), 'bank');
});

Deno.test('normalizeAmount falls back safely for NaN', () => {
  assertEquals(normalizeAmount('25.50', 0), 25.5);
  assertEquals(normalizeAmount(undefined, 99), 99);
  assertEquals(normalizeAmount('not-a-number', 42), 42);
});

Deno.test('recomputeFeePaymentStatus marks fee as Incassati when revenues cover total', async () => {
  let updatedStatus = '';

  const mockBase44 = {
    asServiceRole: {
      entities: {
        Fee: {
          filter: async () => [{ id: 'fee-1', amount: 1000 }],
          update: async (_id: string, payload: { payment_status: string }) => {
            updatedStatus = payload.payment_status;
          },
        },
        Revenue: {
          filter: async () => [{ amount: 300 }, { amount: 700 }],
        },
      },
    },
  };

  const status = await recomputeFeePaymentStatus(mockBase44, 'fee-1');
  assertEquals(status, 'Incassati');
  assertEquals(updatedStatus, 'Incassati');
});

Deno.test('recomputeFeePaymentStatus marks fee as Da incassare when partial', async () => {
  let updatedStatus = '';

  const mockBase44 = {
    asServiceRole: {
      entities: {
        Fee: {
          filter: async () => [{ id: 'fee-2', amount: 1000 }],
          update: async (_id: string, payload: { payment_status: string }) => {
            updatedStatus = payload.payment_status;
          },
        },
        Revenue: {
          filter: async () => [{ amount: 250 }],
        },
      },
    },
  };

  const status = await recomputeFeePaymentStatus(mockBase44, 'fee-2');
  assertEquals(status, 'Da incassare');
  assertEquals(updatedStatus, 'Da incassare');
});
