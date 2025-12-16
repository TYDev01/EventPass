import { describe, it, expect } from "vitest";
import { Cl, ClarityType, ClarityValue, ResponseOkCV, UIntCV, SomeCV, TupleCV } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const buyer = accounts.get("wallet_2")!;
const otherBuyer = accounts.get("wallet_3")!;
const thirdBuyer = accounts.get("wallet_4")!;

const DEFAULT_EVENT = {
  title: "DevCon",
  date: "2025-05-12",
  price: 1_000n,
  totalSeats: 3n,
  metadataUri: "https://metadata.example/devcon.json",
};

const STATUS_ACTIVE = 0n;
const STATUS_CANCELED = 1n;
const STATUS_ENDED = 2n;

function unwrapOkUint(result: ClarityValue): bigint {
  expect(result.type).toBe(ClarityType.ResponseOk);
  const okResult = result as ResponseOkCV<UIntCV>;
  expect(okResult.value.type).toBe(ClarityType.UInt);
  return okResult.value.value;
}

function unwrapEventTuple(cv: ClarityValue): TupleCV {
  expect(cv.type).toBe(ClarityType.OptionalSome);
  const someCv = cv as SomeCV<TupleCV>;
  expect(someCv.value.type).toBe(ClarityType.Tuple);
  return someCv.value;
}

function createEvent({
  title = DEFAULT_EVENT.title,
  date = DEFAULT_EVENT.date,
  price = DEFAULT_EVENT.price,
  totalSeats = DEFAULT_EVENT.totalSeats,
  metadataUri = DEFAULT_EVENT.metadataUri,
} = {}) {
  const call = simnet.callPublicFn(
    "event-pass",
    "create-event",
    [Cl.stringAscii(title), Cl.stringAscii(date), Cl.uint(price), Cl.uint(totalSeats), Cl.stringAscii(metadataUri)],
    creator,
  );

  const eventId = unwrapOkUint(call.result);

  return { eventId, args: { title, date, price, totalSeats, metadataUri } };
}

describe("event-pass contract", () => {
  it("rejects events without available seats", () => {
    const creation = simnet.callPublicFn(
      "event-pass",
      "create-event",
      [
        Cl.stringAscii("Invalid"),
        Cl.stringAscii("2025-01-01"),
        Cl.uint(1_000n),
        Cl.uint(0),
        Cl.stringAscii("https://metadata.example/invalid.json"),
      ],
      creator,
    );

    expect(creation.result).toBeErr(Cl.uint(100));
  });

  it("registers events with metadata and increments the event id counter", () => {
    const { eventId, args } = createEvent();

    const { result: initialTokenUri } = simnet.callReadOnlyFn(
      "event-pass",
      "get-token-uri",
      [
        Cl.tuple({
          "event-id": Cl.uint(eventId),
          seat: Cl.uint(1),
        }),
      ],
      creator,
    );

    expect(initialTokenUri).toBeOk(Cl.none());

    const { result: eventRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-event",
      [Cl.uint(eventId)],
      creator,
    );

    const eventTuple = unwrapEventTuple(eventRaw);
    const eventFields = eventTuple.value;
    expect(eventFields.creator).toBePrincipal(creator);
    expect(eventFields.title).toBeAscii(args.title);
    expect(eventFields.date).toBeAscii(args.date);
    expect(eventFields.price).toBeUint(args.price);
    expect(eventFields["total-seats"]).toBeUint(args.totalSeats);
    expect(eventFields["sold-seats"]).toBeUint(0);
    expect(eventFields.status).toBeUint(STATUS_ACTIVE);
    expect(eventFields["metadata-uri"]).toBeAscii(args.metadataUri);

    const { result: nextIdRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-next-event-id",
      [],
      creator,
    );

    expect(nextIdRaw.type).toBe(ClarityType.UInt);
    const nextId = (nextIdRaw as UIntCV).value;
    expect(nextId).toBe(eventId + 1n);
  });

  it("returns an error when requesting metadata for an unsold seat", () => {
    const { eventId } = createEvent();

    const { result } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      creator,
    );

    expect(result).toBeErr(Cl.uint(105));
  });

  it("allows a buyer to purchase a specific seat and mints the matching NFT", () => {
    const { eventId, args } = createEvent();

    const purchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    expect(purchase.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.standardPrincipal(buyer),
      }),
    );

    const { result: eventAfterRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-event",
      [Cl.uint(eventId)],
      creator,
    );

    const updatedEvent = unwrapEventTuple(eventAfterRaw);
    const updatedFields = updatedEvent.value;
    expect(updatedFields.creator).toBePrincipal(creator);
    expect(updatedFields.title).toBeAscii(args.title);
    expect(updatedFields.date).toBeAscii(args.date);
    expect(updatedFields.price).toBeUint(args.price);
    expect(updatedFields["total-seats"]).toBeUint(args.totalSeats);
    expect(updatedFields["sold-seats"]).toBeUint(1);
    expect(updatedFields.status).toBeUint(STATUS_ACTIVE);
    expect(updatedFields["metadata-uri"]).toBeAscii(args.metadataUri);

    const { result: metadataRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    expect(metadataRaw).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.standardPrincipal(buyer),
      }),
    );

    const { result: tokenUriAfterPurchase } = simnet.callReadOnlyFn(
      "event-pass",
      "get-token-uri",
      [
        Cl.tuple({
          "event-id": Cl.uint(eventId),
          seat: Cl.uint(1),
        }),
      ],
      buyer,
    );

    expect(tokenUriAfterPurchase).toBeOk(Cl.some(Cl.stringAscii(args.metadataUri)));

    const seatTwoPurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(2)],
      otherBuyer,
    );
    expect(seatTwoPurchase.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(2),
        owner: Cl.standardPrincipal(otherBuyer),
      }),
    );

    const seatThreePurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(3)],
      thirdBuyer,
    );
    expect(seatThreePurchase.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(3),
        owner: Cl.standardPrincipal(thirdBuyer),
      }),
    );

    const { result: eventSoldOutRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-event",
      [Cl.uint(eventId)],
      creator,
    );
    const soldOutFields = unwrapEventTuple(eventSoldOutRaw).value;
    expect(soldOutFields["sold-seats"]).toBeUint(3);
    expect(soldOutFields.status).toBeUint(STATUS_ACTIVE);
    expect(soldOutFields["metadata-uri"]).toBeAscii(args.metadataUri);

    const soldOutAttempt = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(soldOutAttempt.result).toBeErr(Cl.uint(104));
  });

  it("lets the contract deployer set and expose a contract metadata URI", () => {
    const metadataUri = "https://metadata.example/collection.json";
    const setMetadata = simnet.callPublicFn(
      "event-pass",
      "set-contract-metadata",
      [Cl.some(Cl.stringAscii(metadataUri))],
      deployer,
    );

    expect(setMetadata.result).toBeOk(Cl.some(Cl.stringAscii(metadataUri)));

    const { result: contractUriRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-contract-uri",
      [],
      deployer,
    );

    expect(contractUriRaw).toBeOk(Cl.some(Cl.stringAscii(metadataUri)));

    const unauthorized = simnet.callPublicFn(
      "event-pass",
      "set-contract-metadata",
      [Cl.some(Cl.stringAscii("https://metadata.example/hijack.json"))],
      buyer,
    );

    expect(unauthorized.result).toBeErr(Cl.uint(107));
  });

  it("rejects double-booking the same seat for an event", () => {
    const { eventId } = createEvent();

    const firstPurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(firstPurchase.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.standardPrincipal(buyer),
      }),
    );

    const secondPurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      otherBuyer,
    );
    expect(secondPurchase.result).toBeErr(Cl.uint(102));

    const { result: metadataRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(metadataRaw).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.standardPrincipal(buyer),
      }),
    );
  });

  it("rejects invalid seat numbers", () => {
    const { eventId } = createEvent();

    const zeroSeatAttempt = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(0)],
      buyer,
    );
    expect(zeroSeatAttempt.result).toBeErr(Cl.uint(103));

    const tooHighAttempt = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(10)],
      buyer,
    );
    expect(tooHighAttempt.result).toBeErr(Cl.uint(103));
  });

  it("rejects ticket purchases for unknown events", () => {
    const purchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(9999), Cl.uint(1)],
      buyer,
    );

    expect(purchase.result).toBeErr(Cl.uint(101));
  });

  it("allows the creator to manage event status transitions", () => {
    const cancelTarget = createEvent();

    const unauthorizedCancel = simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(cancelTarget.eventId)],
      buyer,
    );
    expect(unauthorizedCancel.result).toBeErr(Cl.uint(107));

    const cancelResult = simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(cancelTarget.eventId)],
      creator,
    );
    expect(cancelResult.result).toBeOk(Cl.uint(STATUS_CANCELED));

    const { result: canceledEventRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-event",
      [Cl.uint(cancelTarget.eventId)],
      creator,
    );
    const canceledFields = unwrapEventTuple(canceledEventRaw).value;
    expect(canceledFields.status).toBeUint(STATUS_CANCELED);

    const canceledPurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(cancelTarget.eventId), Cl.uint(1)],
      buyer,
    );
    expect(canceledPurchase.result).toBeErr(Cl.uint(106));

    const endTarget = createEvent();

    const unauthorizedEnd = simnet.callPublicFn(
      "event-pass",
      "end-event",
      [Cl.uint(endTarget.eventId)],
      buyer,
    );
    expect(unauthorizedEnd.result).toBeErr(Cl.uint(107));

    const endResult = simnet.callPublicFn(
      "event-pass",
      "end-event",
      [Cl.uint(endTarget.eventId)],
      creator,
    );
    expect(endResult.result).toBeOk(Cl.uint(STATUS_ENDED));

    const { result: endedEventRaw } = simnet.callReadOnlyFn(
      "event-pass",
      "get-event",
      [Cl.uint(endTarget.eventId)],
      creator,
    );
    const endedFields = unwrapEventTuple(endedEventRaw).value;
    expect(endedFields.status).toBeUint(STATUS_ENDED);

    const endedPurchase = simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(endTarget.eventId), Cl.uint(1)],
      buyer,
    );
    expect(endedPurchase.result).toBeErr(Cl.uint(106));
  });
});
