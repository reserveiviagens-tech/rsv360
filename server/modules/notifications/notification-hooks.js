/**
 * Fire-and-forget hooks from domain modules → CNU dispatch.
 */
function safeDispatch(input) {
  try {
    const dispatch = require('./notification-dispatch.service');
    void dispatch.dispatchNotification(input).catch((err) => {
      console.warn('[notifications-hook]', err instanceof Error ? err.message : err);
    });
  } catch (err) {
    console.warn('[notifications-hook] dispatch unavailable');
  }
}

function notifyAuctionBidPlaced({ auction, bid, user, customerEmail, customerPhone, customerName }) {
  const payload = {
    auctionId: auction?.id,
    auctionTitle: auction?.title,
    amount: bid?.amount,
    customerName: customerName || user?.name || 'Cliente',
  };
  safeDispatch({
    eventKey: 'auction.bid_placed',
    userId: user?.id != null ? String(user.id) : undefined,
    recipient: {
      email: customerEmail || user?.email,
      phone: customerPhone,
      name: payload.customerName,
    },
    payload,
    propertyId: auction?.property_id || 1,
  });
  safeDispatch({
    eventKey: 'ops.auction.new_bid',
    audience: 'operator',
    payload,
    propertyId: auction?.property_id || 1,
  });
}

function notifyAuctionOutbid({ auction, userId, recipient, previousAmount }) {
  safeDispatch({
    eventKey: 'auction.outbid',
    userId: userId != null ? String(userId) : undefined,
    recipient,
    payload: {
      auctionId: auction?.id,
      auctionTitle: auction?.title,
      previousAmount,
    },
    propertyId: auction?.property_id || 1,
  });
}

function notifyAuctionWon({ auction, userId, recipient, amount }) {
  safeDispatch({
    eventKey: 'auction.won',
    userId: userId != null ? String(userId) : undefined,
    recipient,
    payload: {
      auctionId: auction?.id,
      auctionTitle: auction?.title,
      amount,
    },
    propertyId: auction?.property_id || 1,
  });
}

function notifyAuctionPaymentDue({ auction, userId, recipient, dueAt }) {
  safeDispatch({
    eventKey: 'auction.payment_due',
    userId: userId != null ? String(userId) : undefined,
    recipient,
    payload: {
      auctionId: auction?.id,
      auctionTitle: auction?.title,
      paymentDueAt: dueAt,
    },
    propertyId: auction?.property_id || 1,
  });
}

function notifyGuestRequestUpdated({ userId, title, body, meta }) {
  safeDispatch({
    eventKey: 'guest.request_updated',
    userId: userId != null ? String(userId) : undefined,
    payload: { ...meta, title, body },
  });
}

module.exports = {
  notifyAuctionBidPlaced,
  notifyAuctionOutbid,
  notifyAuctionWon,
  notifyAuctionPaymentDue,
  notifyGuestRequestUpdated,
};
