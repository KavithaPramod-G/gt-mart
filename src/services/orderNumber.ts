const ORDER_SEQUENCE_KEY = '@gt_mart_order_sequence';

export function generateOrderNumber(sequence: number): string {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  return `GT-${datePart}-${String(sequence).padStart(4, '0')}`;
}

export function getNextSequenceFromOrders(existingOrderNumbers: string[]): number {
  const todayPrefix = `GT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-`;
  const todaySequences = existingOrderNumbers
    .filter((number) => number.startsWith(todayPrefix))
    .map((number) => Number(number.split('-').pop() ?? 0))
    .filter((value) => !Number.isNaN(value));

  return todaySequences.length > 0 ? Math.max(...todaySequences) + 1 : 1;
}

export { ORDER_SEQUENCE_KEY };
