package com.isms.repository;

import com.isms.model.SalesOrderLineItem;
import com.isms.model.SalesOrderLineItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface SalesOrderLineItemRepository extends JpaRepository<SalesOrderLineItem, SalesOrderLineItemId> {
    List<SalesOrderLineItem> findByIdOrderId(String orderId);
    boolean existsByIdSkuId(String skuId);

    @Query("SELECT li FROM SalesOrderLineItem li JOIN FETCH li.salesOrder so " +
           "WHERE li.id.skuId = :skuId AND li.locationId = :locationId " +
           "AND so.status IN (com.isms.model.enums.SalesStatus.COMPLETED, com.isms.model.enums.SalesStatus.CONFIRMED) " +
           "ORDER BY so.createdAt ASC")
    List<SalesOrderLineItem> findDeliveredLines(@Param("skuId") String skuId, @Param("locationId") String locationId);

    @Query("SELECT li FROM SalesOrderLineItem li JOIN FETCH li.salesOrder so " +
           "WHERE li.id.skuId = :skuId " +
           "AND so.status IN (com.isms.model.enums.SalesStatus.COMPLETED, com.isms.model.enums.SalesStatus.CONFIRMED) " +
           "ORDER BY so.createdAt ASC")
    List<SalesOrderLineItem> findDeliveredLinesBySku(@Param("skuId") String skuId);

    @Query("SELECT li FROM SalesOrderLineItem li JOIN FETCH li.salesOrder so " +
           "WHERE so.status IN (com.isms.model.enums.SalesStatus.COMPLETED, com.isms.model.enums.SalesStatus.CONFIRMED) " +
           "ORDER BY so.createdAt ASC")
    List<SalesOrderLineItem> findAllDeliveredLines();
}
