"use client";

type TransactionStatus = {
  txId: string;
  txStatus: "pending" | "success" | "abort_by_response" | "abort_by_post_condition";
  txResult?: string;
  eventId?: number;
};

export async function checkTransactionStatus(txId: string): Promise<TransactionStatus> {
  try {
    // Use the public API endpoint that supports CORS
    const response = await fetch(`https://api.hiro.so/extended/v1/tx/${txId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      console.log(`Transaction ${txId} not found or still pending`);
      return { txId, txStatus: "pending" };
    }

    const data = await response.json();
    
    // Extract event ID from transaction result if successful
    let eventId: number | undefined;
    
    if (data.tx_status === "success" && data.tx_result?.repr) {
      // The result format is like "(ok u1)" where u1 is the event ID
      const match = data.tx_result.repr.match(/\(ok u(\d+)\)/);
      if (match && match[1]) {
        eventId = parseInt(match[1], 10);
        console.log(`✅ Transaction ${txId} confirmed with event ID: ${eventId}`);
      }
    }

    return {
      txId,
      txStatus: data.tx_status,
      txResult: data.tx_result?.repr,
      eventId
    };
  } catch (error) {
    console.log(`Could not fetch transaction status for ${txId}:`, error);
    // Don't fail - just assume it's still pending
    return { txId, txStatus: "pending" };
  }
}

export async function reconcilePendingWithTransaction(
  pendingTxId: string
): Promise<{ shouldRemove: boolean; eventId?: number }> {
  const status = await checkTransactionStatus(pendingTxId);
  
  if (status.txStatus === "success" && status.eventId !== undefined) {
    return { shouldRemove: true, eventId: status.eventId };
  }
  
  if (status.txStatus === "abort_by_response" || status.txStatus === "abort_by_post_condition") {
    // Transaction failed, should remove from pending
    console.log(`❌ Transaction ${pendingTxId} failed - removing from pending`);
    return { shouldRemove: true };
  }
  
  return { shouldRemove: false };
}
