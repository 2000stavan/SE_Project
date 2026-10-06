package com.isms.repository;

import com.isms.model.SalesOrderLineItem;
import com.isms.model.SalesOrderLineItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalesOrderLineItemRepository extends JpaRepository<SalesOrderLineItem, SalesOrderLineItemId> {
    List<SalesOrderLineItem> findByIdOrderId(String orderId);
}
