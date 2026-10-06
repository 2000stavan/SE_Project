package com.isms.api;

import com.isms.domain.AdministratorService;
import com.isms.domain.SupplierService;
import com.isms.model.Supplier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

    private final SupplierService supplierService;
    private final AdministratorService administratorService;

    public SupplierController(SupplierService supplierService, AdministratorService administratorService) {
        this.supplierService = supplierService;
        this.administratorService = administratorService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Supplier> create(@RequestBody Supplier supplier) {
        Supplier created = supplierService.create(supplier);
        return ResponseEntity.status(201).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Supplier> edit(@PathVariable("id") String id, @RequestBody Supplier updated) {
        Supplier result = supplierService.edit(id, updated);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<List<Supplier>> search(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "min_rating", required = false) BigDecimal minRating
    ) {
        String effectiveQuery = (query != null && !query.isBlank()) ? query : category;
        List<Supplier> suppliers = supplierService.search(effectiveQuery, minRating);
        return ResponseEntity.ok(suppliers);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Supplier> getById(@PathVariable("id") String id) {
        Supplier supplier = supplierService.findById(id);
        return ResponseEntity.ok(supplier);
    }

    @GetMapping("/{id}/performance")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getPerformance(@PathVariable("id") String id) {
        Supplier supplier = supplierService.findById(id);
        return ResponseEntity.ok(Map.of(
                "supplierId", supplier.getSupplierId(),
                "name", supplier.getName(),
                "rating", supplier.getRating(),
                "leadTime", supplier.getLeadTime(),
                "isActive", supplier.getIsActive(),
                "procurementHistory", supplier.getProcurementHistory()
        ));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Supplier> deactivate(@PathVariable("id") String id) {
        Supplier deactivated = administratorService.deactivateSupplier(id);
        return ResponseEntity.ok(deactivated);
    }
}
