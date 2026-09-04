import { Context, Effect } from "effect";

// Shape of a customer as it comes back from the repository
export interface CustomerShape {
  id: string;
  email: string;
  status: string;
  metadata: Record<string, unknown>;
}

// Shape of one order line
export interface LineShape {
  sku: string;
  unitAmount: number;
  quantity: number;
}

export interface OrderShape {
  id: string;
  lines: Array<LineShape>;
}

export interface InvoiceShape {
  customerId: string;
  total: number;
  lineCount: number;
}

// Repository for customers and orders
export class OrderRepository extends Context.Service<
  OrderRepository,
  {
    getCustomer(id: string): Effect.Effect<unknown>;
    listOrders(id: string): Effect.Effect<ReadonlyArray<OrderShape>>;
  }
>()("examples/OrderRepository") {}

// Mailer used to send invoices
export class Mailer extends Context.Service<
  Mailer,
  { send(to: string, invoice: InvoiceShape): Effect.Effect<void> }
>()("examples/Mailer") {}

// Helper to check whether the customer can be invoiced
const isActive = (customer: any) => customer.status === "active";

// Helper to compute the total of one order
const totalOf = (order: OrderShape) => {
  let total = 0;
  for (const line of order.lines) {
    total += line.unitAmount * line.quantity;
  }
  return total;
};

// Gather the totals of every order
const gatherTotals = (orders: ReadonlyArray<OrderShape>) => orders.map(totalOf);

// Build the invoice object from the totals
const buildInvoice = (customerId: string, totals: number[], lineCount: number): InvoiceShape => ({
  customerId,
  total: totals.reduce((sum, total) => sum + total, 0),
  lineCount,
});

// Loading the customer from the repository
const loading = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* OrderRepository;
    const raw = yield* repo.getCustomer(id);
    // The repository returns unknown, so cast it to the customer shape
    return raw as unknown as CustomerShape;
  });

/**
 * Process the invoice for one customer.
 * @param customerId - the customer to invoice
 * @param sendEmail - whether to email the invoice
 * @param dryRun - whether to skip side effects
 * @param verbose - whether to log progress
 */
export const processInvoice = (
  customerId: string,
  sendEmail: boolean,
  dryRun: boolean,
  verbose: boolean,
) =>
  Effect.gen(function* () {
    const repo = yield* OrderRepository;
    const mailer = yield* Mailer;
    const customer = yield* loading(customerId);
    if (!isActive(customer)) {
      return null;
    } else {
      const orders = yield* repo.listOrders(customerId);
      const totals = gatherTotals(orders);
      let lineCount = 0;
      for (const order of orders) {
        lineCount += order.lines.length;
      }
      const invoice = buildInvoice(customerId, totals, lineCount);
      if (verbose) {
        yield* Effect.log(`built invoice for ${invoice.total}`);
      }
      if (!dryRun) {
        if (sendEmail) {
          yield* mailer.send(customer.email!, invoice);
        }
      }
      return invoice;
    }
  });

// Handler for raw requests coming from the API
export const requestHandler = (input: unknown) => {
  if (typeof input === "string") {
    return processInvoice(input, true, false, false);
  }
  const body = input as { customerId: string; dryRun?: boolean };
  return processInvoice(body.customerId, true, body.dryRun ?? false, false);
};
