package com.isms.domain;

import com.isms.audit.AuditLogger;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.model.StockRecord;
import com.isms.model.StockRecordId;
import com.isms.repository.PoLineItemRepository;
import com.isms.repository.ProductRepository;
import com.isms.repository.SalesOrderLineItemRepository;
import com.isms.repository.StockRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final StockRecordRepository stockRecordRepository;
    private final PoLineItemRepository poLineItemRepository;
    private final SalesOrderLineItemRepository salesOrderLineItemRepository;
    private final AuditLogger auditLogger;

    public ProductService(
            ProductRepository productRepository,
            StockRecordRepository stockRecordRepository,
            PoLineItemRepository poLineItemRepository,
            SalesOrderLineItemRepository salesOrderLineItemRepository,
            AuditLogger auditLogger
    ) {
        this.productRepository = productRepository;
        this.stockRecordRepository = stockRecordRepository;
        this.poLineItemRepository = poLineItemRepository;
        this.salesOrderLineItemRepository = salesOrderLineItemRepository;
        this.auditLogger = auditLogger;
    }

    public Product create(Product product) {
        if (productRepository.existsById(product.getSkuId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_SKU", "Product with SKU " + product.getSkuId() + " already exists");
        }

        Product saved = productRepository.save(product);

        // Create initial stock record for location WH-01
        StockRecordId stockId = new StockRecordId(saved.getSkuId(), "WH-01");
        if (!stockRecordRepository.existsById(stockId)) {
            StockRecord initialStock = new StockRecord(stockId, saved, 0, 0, OffsetDateTime.now());
            stockRecordRepository.save(initialStock);
        }

        auditLogger.log("system", "PRODUCT_CREATED", "products", Map.of("sku_id", saved.getSkuId()));
        return saved;
    }

    public Product update(String skuId, Product updated) {
        Product existing = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setUnitPrice(updated.getUnitPrice());
        existing.setReorderPoint(updated.getReorderPoint());
        existing.setUnitOfMeasure(updated.getUnitOfMeasure());
        Product saved = productRepository.save(existing);

        auditLogger.log("system", "PRODUCT_UPDATED", "products", Map.of("sku_id", skuId));
        return saved;
    }

    public void delete(String skuId) {
        Product existing = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

        // Guard D7: Check total quantity on hand across all locations
        List<StockRecord> stocks = stockRecordRepository.findByIdSkuId(skuId);
        int totalQty = stocks.stream().mapToInt(StockRecord::getQuantityOnHand).sum();
        if (totalQty > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "STOCK_EXISTS", "Cannot delete product with quantity on hand > 0");
        }

        // Check if referenced in PO line items
        boolean inPos = poLineItemRepository.findAll().stream().anyMatch(li -> skuId.equals(li.getSkuId()));
        if (inPos) {
            throw new ApiException(HttpStatus.CONFLICT, "REFERENCED_IN_PO", "Cannot delete product referenced in purchase orders");
        }

        // Check if referenced in Sales line items
        boolean inSales = salesOrderLineItemRepository.findAll().stream().anyMatch(li -> skuId.equals(li.getSkuId()));
        if (inSales) {
            throw new ApiException(HttpStatus.CONFLICT, "REFERENCED_IN_SALES", "Cannot delete product referenced in sales orders");
        }

        stockRecordRepository.deleteAll(stocks);
        productRepository.delete(existing);
        auditLogger.log("system", "PRODUCT_DELETED", "products", Map.of("sku_id", skuId));
    }

    public List<Product> search(String query, String category, String location, Integer minQty, Integer maxQty) {
        if ((query == null || query.isBlank()) && (category == null || category.isBlank())) {
            return productRepository.findAll();
        } else if (query != null && !query.isBlank() && (category == null || category.isBlank())) {
            return productRepository.searchByQuery(query.trim());
        } else if ((query == null || query.isBlank()) && category != null && !category.isBlank()) {
            return productRepository.findByCategoryIgnoreCase(category.trim());
        } else {
            return productRepository.searchByQueryAndCategory(query.trim(), category.trim());
        }
    }
}
