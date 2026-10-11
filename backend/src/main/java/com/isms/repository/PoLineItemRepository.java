package com.isms.repository;

import com.isms.model.PoLineItem;
import com.isms.model.PoLineItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoLineItemRepository extends JpaRepository<PoLineItem, PoLineItemId> {
    List<PoLineItem> findByIdPoId(String poId);
    boolean existsByIdSkuId(String skuId);
}
