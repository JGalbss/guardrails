import { Array as Arr, Context, Data, Effect, Number as Num, Schema } from "effect";

export class Line extends Schema.Class<Line>("Line")({
  sku: Schema.String,
  unitAmount: Schema.Number,
  quantity: Schema.Number,
}) {}

export class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  lines: Schema.Array(Line),
}) {}

export class ActiveCustomer extends Schema.TaggedClass<ActiveCustomer>()("ActiveCustomer", {
  id: Schema.String,
  email: Schema.String,
}) {}

export class ClosedCustomer extends Schema.TaggedClass<ClosedCustomer>()("ClosedCustomer", {
  id: Schema.String,
}) {}

export const Customer = Schema.Union([ActiveCustomer, ClosedCustomer]);
export type Customer = typeof Customer.Type;

export class Invoice extends Schema.Class<Invoice>("Invoice")({
  customerId: Schema.String,
  total: Schema.Number,
  lineCount: Schema.Number,
}) {}

export class CustomerClosed extends Schema.TaggedError<CustomerClosed>()("CustomerClosed", {
  customerId: Schema.String,
}) {}

export class Orders extends Context.Service<
  Orders,
  {
    readonly customer: (id: string) => Effect.Effect<Customer>;
    readonly forCustomer: (id: string) => Effect.Effect<ReadonlyArray<Order>>;
  }
>()("examples/Orders") {}

export class Mail extends Context.Service<
  Mail,
  { readonly send: (to: string, invoice: Invoice) => Effect.Effect<void> }
>()("examples/Mail") {}

export type Delivery = Data.TaggedEnum<{
  readonly Send: {};
  readonly Preview: {};
}>;
export const Delivery = Data.taggedEnum<Delivery>();

export const invoice = Effect.fn("invoice")(function* (customerId: string, delivery: Delivery) {
  const orders = yield* Orders;
  const mail = yield* Mail;

  const customer = yield* orders.customer(customerId);
  if (customer._tag === "ClosedCustomer") return yield* new CustomerClosed({ customerId });

  const lines = Arr.flatMap(yield* orders.forCustomer(customerId), (order) => order.lines);
  const document = new Invoice({
    customerId,
    total: Num.sumAll(Arr.map(lines, (line) => line.unitAmount * line.quantity)),
    lineCount: lines.length,
  });

  return yield* Delivery.$match(delivery, {
    Preview: () => Effect.succeed(document),
    Send: () => Effect.as(mail.send(customer.email, document), document),
  });
});

export class InvoiceRequest extends Schema.Class<InvoiceRequest>("InvoiceRequest")({
  customerId: Schema.String,
  delivery: Schema.Literals(["send", "preview"]),
}) {}

export const decodeRequest = Schema.decodeUnknownEffect(InvoiceRequest);

const deliveries: Record<InvoiceRequest["delivery"], Delivery> = {
  send: Delivery.Send(),
  preview: Delivery.Preview(),
};

export const fromRequest = Effect.fn("fromRequest")(function* (request: InvoiceRequest) {
  return yield* invoice(request.customerId, deliveries[request.delivery]);
});
