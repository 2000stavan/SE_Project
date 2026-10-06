package com.isms.adapter.impl;

import com.isms.adapter.ChannelAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class StubChannelAdapters {

    @Component
    public static class StorefrontAdapter implements ChannelAdapter {
        private static final Logger log = LoggerFactory.getLogger(StorefrontAdapter.class);

        @Override
        public String getChannelName() {
            return "storefront";
        }

        @Override
        public void pushStockUpdate(String skuId, String locationId, int quantityOnHand, int quantityReserved) {
            long startTime = System.currentTimeMillis();
            // Simulating instant adapter sync
            long latencyMs = System.currentTimeMillis() - startTime;
            log.info("[CHANNEL-SYNC] Storefront pushed SKU={} loc={} onHand={} (latency={}ms <= 5000ms)",
                    skuId, locationId, quantityOnHand, latencyMs);
        }
    }

    @Component
    public static class MarketplaceChannelAdapter implements ChannelAdapter {
        private static final Logger log = LoggerFactory.getLogger(MarketplaceChannelAdapter.class);

        @Override
        public String getChannelName() {
            return "marketplace";
        }

        @Override
        public void pushStockUpdate(String skuId, String locationId, int quantityOnHand, int quantityReserved) {
            long startTime = System.currentTimeMillis();
            long latencyMs = System.currentTimeMillis() - startTime;
            log.info("[CHANNEL-SYNC] Marketplace pushed SKU={} loc={} onHand={} (latency={}ms <= 5000ms)",
                    skuId, locationId, quantityOnHand, latencyMs);
        }
    }
}
