package com.isms.repository;

import com.isms.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, String> {
    List<Supplier> findByIsActiveTrueOrderByRatingDesc();
    List<Supplier> findAllByOrderByRatingDesc();
    List<Supplier> findByRatingGreaterThanEqualOrderByRatingDesc(BigDecimal minRating);
    List<Supplier> findByNameContainingIgnoreCaseOrderByRatingDesc(String name);
    List<Supplier> findByNameContainingIgnoreCaseAndRatingGreaterThanEqualOrderByRatingDesc(String name, BigDecimal minRating);
}

