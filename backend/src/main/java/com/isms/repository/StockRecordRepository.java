package com.isms.repository;

import com.isms.model.StockRecord;
import com.isms.model.StockRecordId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRecordRepository extends JpaRepository<StockRecord, StockRecordId> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockRecord s WHERE s.id = :id")
    Optional<StockRecord> findByIdForUpdate(@Param("id") StockRecordId id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockRecord s WHERE s.id.skuId = :skuId AND s.id.locationId = :locationId")
    Optional<StockRecord> findBySkuIdAndLocationIdForUpdate(@Param("skuId") String skuId, @Param("locationId") String locationId);

    List<StockRecord> findByIdSkuId(String skuId);

    Optional<StockRecord> findByIdSkuIdAndIdLocationId(String skuId, String locationId);

    List<StockRecord> findByIdLocationId(String locationId);

    @Query("SELECT s FROM StockRecord s WHERE " +
           "(:sku IS NULL OR s.id.skuId = :sku) AND " +
           "(:location IS NULL OR s.id.locationId = :location) AND " +
           "(:minQty IS NULL OR s.quantityOnHand >= :minQty) AND " +
           "(:maxQty IS NULL OR s.quantityOnHand <= :maxQty)")
    List<StockRecord> searchStock(
            @Param("sku") String sku,
            @Param("location") String location,
            @Param("minQty") Integer minQty,
            @Param("maxQty") Integer maxQty
    );
}
