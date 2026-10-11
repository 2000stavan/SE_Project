package com.isms.api;

import com.isms.domain.ProductService;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.repository.ProductRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;
    private final ProductRepository productRepository;

    public ProductController(ProductService productService, ProductRepository productRepository) {
        this.productService = productService;
        this.productRepository = productRepository;
    }

    public record CreateProductRequest(
            @NotBlank String sku_id,
            @NotBlank String name,
            @NotBlank String category,
            @NotNull BigDecimal unit_price,
            Integer reorder_point,
            @NotBlank String unit_of_measure
    ) {}

    public record UpdateProductRequest(
            String name,
            String category,
            BigDecimal unit_price,
            Integer reorder_point,
            String unit_of_measure
    ) {}

    @GetMapping
    public ResponseEntity<List<Product>> searchProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer min_qty,
            @RequestParam(required = false) Integer max_qty
    ) {
        List<Product> results = productService.search(q, category, location, min_qty, max_qty);
        return ResponseEntity.ok(results);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<Product> createProduct(@RequestBody @jakarta.validation.Valid CreateProductRequest request) {
        Product p = new Product(
                request.sku_id(),
                request.name(),
                request.category(),
                request.unit_price(),
                request.reorder_point() != null ? request.reorder_point() : 0,
                request.unit_of_measure()
        );
        Product created = productService.create(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{sku}")
    public ResponseEntity<Product> getProduct(@PathVariable("sku") String sku) {
        Product p = productRepository.findById(sku)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + sku));
        return ResponseEntity.ok(p);
    }

    @PatchMapping("/{sku}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<Product> updateProduct(
            @PathVariable("sku") String sku,
            @RequestBody UpdateProductRequest request
    ) {
        Product existing = productRepository.findById(sku)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + sku));

        if (request.name() != null) existing.setName(request.name());
        if (request.category() != null) existing.setCategory(request.category());
        if (request.unit_price() != null) existing.setUnitPrice(request.unit_price());
        if (request.reorder_point() != null) existing.setReorderPoint(request.reorder_point());
        if (request.unit_of_measure() != null) existing.setUnitOfMeasure(request.unit_of_measure());

        Product updated = productService.update(sku, existing);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{sku}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Void> deleteProduct(@PathVariable("sku") String sku) {
        productService.delete(sku);
        return ResponseEntity.noContent().build();
    }
}
