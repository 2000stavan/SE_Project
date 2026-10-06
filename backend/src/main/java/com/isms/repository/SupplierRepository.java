package com.isms.repository;

import com.isms.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, String> {
    List<Supplier> findByIsActiveTrueOrderByRatingDesc();

    @Query("SELECT s FROM Supplier s WHERE (:query IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%'))) AND (:minRating IS NULL OR s.rating >= :minRating) ORDER BY s.rating DESC")
    List<Supplier> searchSuppliers(@Param("query") String query, @Param("minRating") BigDecimal minRating);
}
