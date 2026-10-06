package com.isms.adapter;

public interface ChannelAdapter {
    String getChannelName();
    void pushStockUpdate(String skuId, String locationId, int quantityOnHand, int quantityReserved);
}
