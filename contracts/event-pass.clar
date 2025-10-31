
(define-constant ERR-ZERO-SEATS (err u100)) ;; Error returned when an event is registered without any available seats.
(define-constant ERR-NO-SUCH-EVENT (err u101)) ;; Error returned when a caller references an event identifier that does not exist.
(define-constant ERR-SEAT-TAKEN (err u102)) ;; Error returned when an attempt is made to buy a seat that was already sold.
(define-constant ERR-INVALID-SEAT (err u103)) ;; Error returned when the requested seat number is out of the valid range.
(define-constant ERR-SOLD-OUT (err u104)) ;; Error returned when all tickets for the event have already been sold.
(define-constant ERR-NO-TICKET (err u105)) ;; Error returned when the contract cannot find metadata for a given ticket request.
(define-constant ERR-EVENT-INACTIVE (err u106)) ;; Error returned when a ticket action is attempted on an inactive event.
(define-constant ERR-NOT-CREATOR (err u107)) ;; Error returned when a non-creator attempts to manage an event.
(define-constant ERR-STATUS-TRANSITION (err u108)) ;; Error returned when an invalid status transition is requested.

(define-constant STATUS-ACTIVE u0) ;; Status code meaning the event is active and accepting ticket purchases.
(define-constant STATUS-CANCELED u1) ;; Status code meaning the event has been canceled by its creator.
(define-constant STATUS-ENDED u2) ;; Status code meaning the event has ended and should no longer sell tickets.

(define-data-var next-event-id uint u1) ;; Persistent counter that assigns incremental identifiers to new events starting at 1.

(define-map events ;; Storage map that keeps the core metadata for each event keyed by its identifier.
  {event-id: uint} ;; Map key specification: the event identifier.
  {creator: principal, title: (string-ascii 64), date: (string-ascii 32), price: uint, total-seats: uint, sold-seats: uint, status: uint}) ;; Map value specification describing who created the event, its ticketing details, and lifecycle status.

(define-map tickets ;; Storage map that keeps track of each sold seat per event.
  {event-id: uint, seat: uint} ;; Map key specification combining the event identifier and seat number.
  {owner: principal}) ;; Map value specification storing the principal that owns this seat.

(define-non-fungible-token ticket ;; Declaration of the NFT collection used to represent tickets.
  {event-id: uint, seat: uint}) ;; Each NFT token identifier is the pair of event identifier and seat number.

;; function get-next-event-id: exposes the identifier that will be used for the next event registration.
(define-read-only (get-next-event-id) ;; Read-only helper that reveals the next event identifier that will be assigned.
  (var-get next-event-id)) ;; Return the current value of the incrementing event counter.

;; function get-event: returns stored metadata for a particular event id when available.
(define-read-only (get-event (event-id uint)) ;; Read-only helper that fetches the metadata for a single event.
  (map-get? events {event-id: event-id})) ;; Return the optional event record stored under the requested identifier.

;; function get-ticket-metadata: surfaces ownership details for a specific event seat.
(define-read-only (get-ticket-metadata (event-id uint) (seat uint)) ;; Read-only helper that returns the metadata tuple for a given ticket.
  (match (map-get? tickets {event-id: event-id, seat: seat}) ;; Attempt to find the ticket ownership record for the supplied event and seat.
    ticket-record ;; When the lookup succeeds, bind the ticket record to the name ticket-record.
    (ok {event-id: event-id, seat: seat, owner: (get owner ticket-record)}) ;; Return the metadata as a response containing event id, seat, and owner.
    ERR-NO-TICKET)) ;; If the ticket does not exist, propagate an error indicating that no ticket was found.

;; function create-event: lets any caller register a new event with pricing and capacity information.
(define-public (create-event (title (string-ascii 64)) (date (string-ascii 32)) (price uint) (total-seats uint)) ;; Public function that lets any principal register a new event.
  (begin ;; Sequence the event creation steps.
    (asserts! (> total-seats u0) ERR-ZERO-SEATS) ;; Ensure the event offers at least one seat before continuing.
    (let ((event-id (var-get next-event-id))) ;; Grab the current counter value so we can use it as the new event identifier.
      (begin ;; Sequence the state changes required to register the event.
        (map-set events ;; Persist the new event metadata into storage.
          {event-id: event-id} ;; Use the freshly allocated identifier as the map key.
          {creator: tx-sender, ;; Store the principal that created the event.
           title: title, ;; Record the human-readable event title supplied by the creator.
           date: date, ;; Record the event date string provided by the creator.
           price: price, ;; Record the ticket price in micro-STX units.
           total-seats: total-seats, ;; Record the total number of seats for sale.
           sold-seats: u0, ;; Initialize the sold tickets counter to zero.
           status: STATUS-ACTIVE}) ;; Mark the event as active so ticket sales are permitted.
        (var-set next-event-id (+ event-id u1)) ;; Increment the counter so the next event receives a new identifier.
        (ok event-id))))) ;; Return the newly assigned event identifier wrapped in an ok response.

;; function purchase-ticket: sells a designated seat, updates inventory, and mints the ticket NFT.
(define-public (purchase-ticket (event-id uint) (seat uint)) ;; Public function that lets a user purchase a specific seat for an event.
  (let ((event-data (unwrap! (map-get? events {event-id: event-id}) ERR-NO-SUCH-EVENT))) ;; Retrieve the event metadata or abort if the event identifier is unknown.
    (let ((updated-sold (+ (get sold-seats event-data) u1))) ;; Pre-calculate the new sold count after this transaction.
      (begin ;; Sequence the validations and state updates needed to mint the ticket.
        (asserts! (is-eq (get status event-data) STATUS-ACTIVE) ERR-EVENT-INACTIVE) ;; Ensure the event is currently active before allowing a purchase.
        (asserts! (< (get sold-seats event-data) (get total-seats event-data)) ERR-SOLD-OUT) ;; Ensure the event still has capacity before processing the request.
        (asserts! (> seat u0) ERR-INVALID-SEAT) ;; Reject seat numbers less than one.
        (asserts! (<= seat (get total-seats event-data)) ERR-INVALID-SEAT) ;; Reject seat numbers that exceed the event's seat supply.
        (asserts! (is-none (map-get? tickets {event-id: event-id, seat: seat})) ERR-SEAT-TAKEN) ;; Ensure the seat has not already been sold.
        (asserts! (<= updated-sold (get total-seats event-data)) ERR-SOLD-OUT) ;; Ensure selling this ticket does not exceed the total seat count.
        (try! (stx-transfer? (get price event-data) tx-sender (get creator event-data))) ;; Collect payment by transferring the ticket price from the buyer to the event creator.
        (map-set tickets ;; Record the new ticket ownership entry.
          {event-id: event-id, ;; Use the event identifier as part of the composite key.
           seat: seat} ;; Use the seat number as the second part of the composite key.
          {owner: tx-sender}) ;; Store the buyer principal as the owner of this seat.
        (map-set events ;; Update the event metadata to reflect the incremented sold count.
          {event-id: event-id} ;; Target the existing event record using its identifier.
          {creator: (get creator event-data), ;; Preserve the event creator's principal.
           title: (get title event-data), ;; Preserve the original event title.
           date: (get date event-data), ;; Preserve the event date value.
           price: (get price event-data), ;; Preserve the ticket price.
           total-seats: (get total-seats event-data), ;; Preserve the total seat count.
           sold-seats: updated-sold, ;; Replace the sold tickets counter with the new value.
           status: (get status event-data)}) ;; Keep the event status unchanged during the sale.
        (try! (nft-mint? ticket ;; Mint the NFT representation of the ticket.
                         {event-id: event-id, ;; Use the event identifier as part of the NFT token identifier.
                          seat: seat} ;; Use the seat number as the second component of the NFT token identifier.
                         tx-sender)) ;; Assign ownership of the freshly minted NFT to the buyer.
        (ok {event-id: event-id, seat: seat, owner: tx-sender}))))) ;; Return the ticket metadata confirming the purchase.

;; function cancel-event: allows the event creator to mark an event as canceled and halt future ticket sales.
(define-public (cancel-event (event-id uint)) ;; Public function enabling the creator to cancel an event.
  (let ((event-data (unwrap! (map-get? events {event-id: event-id}) ERR-NO-SUCH-EVENT))) ;; Retrieve the event metadata or abort if the identifier is unknown.
    (begin ;; Sequence validations before updating status.
      (asserts! (is-eq tx-sender (get creator event-data)) ERR-NOT-CREATOR) ;; Ensure only the original creator can manage the event status.
      (asserts! (is-eq (get status event-data) STATUS-ACTIVE) ERR-STATUS-TRANSITION) ;; Permit cancelation only when the event is still active.
      (map-set events ;; Write the updated status while preserving other fields.
        {event-id: event-id} ;; Target the existing event record by identifier.
        {creator: (get creator event-data), ;; Preserve event creator.
         title: (get title event-data), ;; Preserve event title.
         date: (get date event-data), ;; Preserve event date.
         price: (get price event-data), ;; Preserve ticket price.
         total-seats: (get total-seats event-data), ;; Preserve capacity.
         sold-seats: (get sold-seats event-data), ;; Preserve sales count.
         status: STATUS-CANCELED}) ;; Apply the canceled status code.
      (ok STATUS-CANCELED)))) ;; Return the new status code to the caller.

;; function end-event: allows the event creator to mark an event as ended once it is complete.
(define-public (end-event (event-id uint)) ;; Public function enabling the creator to end an event.
  (let ((event-data (unwrap! (map-get? events {event-id: event-id}) ERR-NO-SUCH-EVENT))) ;; Retrieve the event metadata or abort if the identifier is unknown.
    (begin ;; Sequence validations before updating status.
      (asserts! (is-eq tx-sender (get creator event-data)) ERR-NOT-CREATOR) ;; Ensure only the original creator can mark the event as ended.
      (asserts! (is-eq (get status event-data) STATUS-ACTIVE) ERR-STATUS-TRANSITION) ;; Permit ending only when the event is active.
      (map-set events ;; Write the updated status while preserving other fields.
        {event-id: event-id} ;; Target the existing event record by identifier.
        {creator: (get creator event-data), ;; Preserve event creator.
         title: (get title event-data), ;; Preserve event title.
         date: (get date event-data), ;; Preserve event date.
         price: (get price event-data), ;; Preserve ticket price.
         total-seats: (get total-seats event-data), ;; Preserve capacity.
         sold-seats: (get sold-seats event-data), ;; Preserve sales count.
         status: STATUS-ENDED}) ;; Apply the ended status code.
      (ok STATUS-ENDED)))) ;; Return the new status code to the caller.
