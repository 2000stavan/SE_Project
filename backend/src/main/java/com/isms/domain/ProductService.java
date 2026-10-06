package com.isms.domain;

import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product create(Product product) {
        if (productRepository.existsById(product.getSkuId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_SKU", "Product with SKU " + product.getSkuId() + " already exists");
        }
        return productRepository.save(product);
    }

    public Product update(String skuId, Product updated) {
        Product existing = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found"));
        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setUnitPrice(updated.getUnitPrice());
        existing.setReorderPoint(updated.getReorderPoint());
        existing.setUnitOfMeasure(updated.getUnitOfMeasure());
        return productRepository.save(existing);
    }

    public void delete(String skuId) {
        Product existing = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found"));
        productRepository.delete(existing);
    }

    public List<Product> search(String query, String category, String location, Integer minQty, Integer maxQty) {
        return productRepository.searchProducts(query, category);
    }
}
