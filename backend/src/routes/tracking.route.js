const express = require('express');
const crypto = require('crypto');
const { sendMetaServerEvent } = require('../../../server/modules/tracking/meta-capi.service');
const { sendTikTokServerEvent } = require('../../../server/modules/tracking/tiktok-events-api.service');
const { claimTrackingEventId } = require('../../../server/modules/tracking/event-dedup');

const router = express.Router();

router.post('/event', async (req, res) => {
  const eventName = req.body?.eventName || 'UnknownEvent';
  const eventId = req.body?.eventId || crypto.randomUUID();

  const claim = await claimTrackingEventId(eventId);
  if (!claim.claimed) {
    return res.status(200).json({
      success: true,
      deduplicated: true,
      eventId,
      store: claim.store,
    });
  }

  const payload = {
    eventName,
    eventId,
    data: req.body?.data || {},
    pageUrl: req.body?.pageUrl || req.get('referer') || null,
    userAgent: req.body?.userAgent || req.get('user-agent') || null,
    propertyId: req.propertyId || 1,
  };

  try {
    await Promise.all([
      sendMetaServerEvent(payload),
      sendTikTokServerEvent(payload),
    ]);
  } catch (err) {
    console.warn('[TRACKING] dispatch failure:', err.message);
  }

  res.status(201).json({
    success: true,
    eventId,
    dispatched: true,
    store: claim.store,
  });
});

module.exports = { trackingRouter: router };
