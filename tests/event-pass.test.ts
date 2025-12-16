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
        owner: Cl.principal(buyer),
        refunded: Cl.bool(false),
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
        refunded: Cl.bool(false),
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

  it("allows ticket holders to transfer their tickets with a 5% fee", () => {
    const { eventId } = createEvent();

    // First, buyer purchases a ticket
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
        owner: Cl.principal(buyer),
      }),
    );

    // Verify buyer owns the ticket
    const { result: ticketBeforeTransfer } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(ticketBeforeTransfer).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.principal(buyer),
        refunded: Cl.bool(false),
      }),
    );

    // Transfer ticket to otherBuyer (5% transfer fee = 1000 * 0.05 = 50)
    const transfer = simnet.callPublicFn(
      "event-pass",
      "transfer-ticket",
      [Cl.uint(eventId), Cl.uint(1), Cl.principal(otherBuyer)],
      buyer,
    );
    
    expect(transfer.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        from: Cl.principal(buyer),
        to: Cl.principal(otherBuyer),
        fee: Cl.uint(50), // 5% of 1000
      }),
    );

    // Verify new owner
    const { result: ticketAfterTransfer } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      otherBuyer,
    );
    expect(ticketAfterTransfer).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.principal(otherBuyer),
        refunded: Cl.bool(false),
      }),
    );
  });

  it("prevents non-owners from transferring tickets", () => {
    const { eventId } = createEvent();

    // buyer purchases ticket
    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // thirdBuyer (non-owner) attempts to transfer
    const unauthorizedTransfer = simnet.callPublicFn(
      "event-pass",
      "transfer-ticket",
      [Cl.uint(eventId), Cl.uint(1), Cl.principal(otherBuyer)],
      thirdBuyer,
    );
    expect(unauthorizedTransfer.result).toBeErr(Cl.uint(111)); // ERR-NOT-TICKET-OWNER
  });

  it("prevents transferring tickets to yourself", () => {
    const { eventId } = createEvent();

    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    const selfTransfer = simnet.callPublicFn(
      "event-pass",
      "transfer-ticket",
      [Cl.uint(eventId), Cl.uint(1), Cl.principal(buyer)],
      buyer,
    );
    expect(selfTransfer.result).toBeErr(Cl.uint(112)); // ERR-TRANSFER-TO-SELF
  });

  it("prevents transferring tickets for ended events", () => {
    const { eventId } = createEvent();

    // Purchase ticket
    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // End the event
    simnet.callPublicFn(
      "event-pass",
      "end-event",
      [Cl.uint(eventId)],
      creator,
    );

    // Try to transfer after event ended
    const transferAfterEnd = simnet.callPublicFn(
      "event-pass",
      "transfer-ticket",
      [Cl.uint(eventId), Cl.uint(1), Cl.principal(otherBuyer)],
      buyer,
    );
    expect(transferAfterEnd.result).toBeErr(Cl.uint(106)); // ERR-EVENT-INACTIVE
  });

  it("allows transferring tickets for canceled events", () => {
    const { eventId } = createEvent();

    // Purchase ticket
    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // Cancel the event
    simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(eventId)],
      creator,
    );

    // Transfer should still work for canceled events (in case of refunds/resales)
    const transferAfterCancel = simnet.callPublicFn(
      "event-pass",
      "transfer-ticket",
      [Cl.uint(eventId), Cl.uint(1), Cl.principal(otherBuyer)],
      buyer,
    );
    expect(transferAfterCancel.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        from: Cl.principal(buyer),
        to: Cl.principal(otherBuyer),
        fee: Cl.uint(50),
      }),
    );
  });

  it("allows ticket holders to claim refunds for canceled events", () => {
    const { eventId } = createEvent();

    // Purchase ticket
    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // Cancel the event
    simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(eventId)],
      creator,
    );

    // Claim refund (burns NFT, marks as refunded)
    const claim = simnet.callPublicFn(
      "event-pass",
      "claim-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    expect(claim.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        "refund-amount": Cl.uint(1000),
      }),
    );

    // Verify ticket is marked as refunded
    const { result: ticketAfterClaim } = simnet.callReadOnlyFn(
      "event-pass",
      "get-ticket-metadata",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(ticketAfterClaim).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        owner: Cl.principal(buyer),
        refunded: Cl.bool(true),
      }),
    );

    // Get initial buyer balance
    const initialBalance = simnet.getAssetsMap().get("STX")?.get(buyer) || 0n;

    // Creator processes the refund payment
    const process = simnet.callPublicFn(
      "event-pass",
      "process-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      creator,
    );

    expect(process.result).toBeOk(
      Cl.tuple({
        "event-id": Cl.uint(eventId),
        seat: Cl.uint(1),
        "refunded-to": Cl.principal(buyer),
        amount: Cl.uint(1000),
      }),
    );

    // Verify refund was received
    const finalBalance = simnet.getAssetsMap().get("STX")?.get(buyer) || 0n;
    expect(finalBalance).toBe(initialBalance + 1000n);
  });

  it("prevents refund claims for non-canceled events", () => {
    const { eventId } = createEvent();

    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // Try to claim refund without canceling
    const claim = simnet.callPublicFn(
      "event-pass",
      "claim-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(claim.result).toBeErr(Cl.uint(114)); // ERR-EVENT-NOT-CANCELED
  });

  it("prevents non-owners from claiming refunds", () => {
    const { eventId } = createEvent();

    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(eventId)],
      creator,
    );

    // otherBuyer tries to claim refund for buyer's ticket
    const claim = simnet.callPublicFn(
      "event-pass",
      "claim-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      otherBuyer,
    );
    expect(claim.result).toBeErr(Cl.uint(111)); // ERR-NOT-TICKET-OWNER
  });

  it("prevents double refund claims", () => {
    const { eventId } = createEvent();

    simnet.callPublicFn(
      "event-pass",
      "purchase-ticket",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    simnet.callPublicFn(
      "event-pass",
      "cancel-event",
      [Cl.uint(eventId)],
      creator,
    );

    // First claim succeeds
    simnet.callPublicFn(
      "event-pass",
      "claim-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );

    // Second claim attempt fails
    const secondClaim = simnet.callPublicFn(
      "event-pass",
      "claim-refund",
      [Cl.uint(eventId), Cl.uint(1)],
      buyer,
    );
    expect(secondClaim.result).toBeErr(Cl.uint(113)); // ERR-ALREADY-REFUNDED
  });
});
