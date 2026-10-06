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
        if (supplierRepository.existsById(supplier.getSupplierId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_SUPPLIER", "Supplier ID already exists");
        }
        return supplierRepository.save(supplier);
    }

    public Supplier edit(String supplierId, Supplier updated) {
        Supplier existing = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found"));
        existing.setName(updated.getName());
        existing.setContactDetails(updated.getContactDetails());
        existing.setLeadTime(updated.getLeadTime());
        existing.setRating(updated.getRating());
        return supplierRepository.save(existing);
    }

    public void trackPerformance(String supplierId, boolean onTime, BigDecimal ratingAdjustment) {
        Supplier existing = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found"));
        // Performance calculation logic
        supplierRepository.save(existing);
    }

    public List<Supplier> search(String query, BigDecimal minRating) {
        return supplierRepository.searchSuppliers(query, minRating);
    }
}
