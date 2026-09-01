import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotFor } from '../src/scheduling/slots.ts';
import { dispatch } from '../src/scheduling/dispatch.ts';
import { workOrders } from '../src/db.ts';

test('a customer is quoted a window around the requested time', () => {
  const order = workOrders.find((w) => w.id === 'W-5001')!;
  const slot = slotFor(order);
  assert.equal(slot.window, '08:00 to 11:00');
  assert.equal(slot.date, '2026-09-02');
});

test('dispatch only plans queued work', () => {
  const plan = dispatch(workOrders.map((w) => ({ ...w, status: 'DONE' as const })));
  assert.equal(plan.length, 0);
});

test('dispatch matches the required skill', () => {
  const plan = dispatch(workOrders);
  const backflow = plan.find((a) => a.workOrderId === 'W-5003');
  assert.equal(backflow?.engineerId, 'E-02');
});

// JOB B: two vans, one house. Addresses are typed in by whoever takes the call,
// so the same house comes through spelled differently. W-5001 and W-5002 are both
// for 14 Ashfield Row on the same morning, differing only in case and spacing.
// Exactly one van should go.
test('one visit per address per day, even when the address is typed differently', () => {
  const plan = dispatch(workOrders);
  const atAshfield = plan.filter(
    (a) => a.address.replace(/\s+/g, ' ').trim().toLowerCase() === '14 ashfield row, bristol',
  );
  assert.equal(
    atAshfield.length,
    1,
    `expected one visit to Mrs Whitcombe's house, got ${atAshfield.length}: ${atAshfield
      .map((a) => a.workOrderId)
      .join(', ')}`,
  );
});
