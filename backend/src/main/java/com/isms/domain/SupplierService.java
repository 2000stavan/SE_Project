package com.isms.domain;

import com.isms.error.ApiException;
import com.isms.model.Supplier;
import com.isms.repository.SupplierRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public Supplier create(Supplier supplier) {
        if (supplier.getSupplierId() == null || supplier.getSupplierId().isBlank()) {
            supplier.setSupplierId("SUP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        if (supplierRepository.existsById(supplier.getSupplierId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_SUPPLIER", "Supplier ID already exists");
        }
        if (supplier.getName() == null || supplier.getName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SUPPLIER_NAME", "Supplier name cannot be blank");
        }
        if (supplier.getRating() == null) {
            supplier.setRating(BigDecimal.valueOf(3.00));
        }
        if (supplier.getLeadTime() == null) {
            supplier.setLeadTime(7);
        }
        if (supplier.getIsActive() == null) {
            supplier.setIsActive(true);
        }
        if (supplier.getProcurementHistory() == null) {
            supplier.setProcurementHistory("");
        }
        return supplierRepository.save(supplier);
    }

    public Supplier edit(String supplierId, Supplier updated) {
        Supplier existing = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found"));
        if (updated.getName() != null && !updated.getName().isBlank()) {
            existing.setName(updated.getName());
        }
        if (updated.getContactDetails() != null) {
            existing.setContactDetails(updated.getContactDetails());
        }
        if (updated.getLeadTime() != null) {
            existing.setLeadTime(updated.getLeadTime());
        }
        if (updated.getRating() != null) {
            existing.setRating(updated.getRating());
        }
        if (updated.getIsActive() != null) {
            existing.setIsActive(updated.getIsActive());
        }
        return supplierRepository.save(existing);
    }

    public void trackPerformance(String supplierId, boolean onTime, BigDecimal ratingAdjustment) {
        Supplier existing = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found: " + supplierId));

        BigDecimal currentRating = existing.getRating() != null ? existing.getRating() : BigDecimal.valueOf(3.00);
        BigDecimal adjustment = ratingAdjustment != null ? ratingAdjustment : BigDecimal.ZERO;
        BigDecimal newRating = currentRating.add(adjustment);

        if (newRating.compareTo(BigDecimal.valueOf(5.00)) > 0) newRating = BigDecimal.valueOf(5.00);
        if (newRating.compareTo(BigDecimal.ZERO) < 0) newRating = BigDecimal.ZERO;
        existing.setRating(newRating.setScale(2, java.math.RoundingMode.HALF_UP));

        String entry = String.format("[%s] Order processed: on_time=%b, rating_adj=%s, new_rating=%s\n",
                java.time.LocalDate.now(), onTime, adjustment, existing.getRating());
        String history = existing.getProcurementHistory() != null ? existing.getProcurementHistory() : "";
        existing.setProcurementHistory(history + entry);

        supplierRepository.save(existing);
    }

    public List<Supplier> search(String query, BigDecimal minRating) {
        boolean hasQuery = query != null && !query.trim().isEmpty();
        boolean hasRating = minRating != null;

        if (hasQuery && hasRating) {
            return supplierRepository.findByNameContainingIgnoreCaseAndRatingGreaterThanEqualOrderByRatingDesc(query.trim(), minRating);
        } else if (hasQuery) {
            return supplierRepository.findByNameContainingIgnoreCaseOrderByRatingDesc(query.trim());
        } else if (hasRating) {
            return supplierRepository.findByRatingGreaterThanEqualOrderByRatingDesc(minRating);
        } else {
            return supplierRepository.findAllByOrderByRatingDesc();
        }
    }

    public Supplier findById(String supplierId) {
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found: " + supplierId));
    }
}
