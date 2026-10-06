package com.isms.repository;

import com.isms.model.SalesOrder;
import com.isms.model.enums.SalesStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface SalesOrderRepository extends JpaRepository<SalesOrder, String> {
    List<SalesOrder> findByChannel(String channel);
    List<SalesOrder> findAllByOrderByCreatedAtDesc();

    @Query("SELECT so FROM SalesOrder so WHERE " +
           "(:channel IS NULL OR so.channel = :channel) AND " +
           "(:status IS NULL OR so.status = :status) AND " +
           "(cast(:from as timestamp) IS NULL OR so.createdAt >= :from) AND " +
           "(cast(:to as timestamp) IS NULL OR so.createdAt <= :to) " +
           "ORDER BY so.createdAt DESC")
    List<SalesOrder> filterOrders(
            @Param("channel") String channel,
            @Param("status") SalesStatus status,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );
}
