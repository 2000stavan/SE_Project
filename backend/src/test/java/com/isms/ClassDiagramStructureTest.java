package com.isms;

import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Locks the code to the UML class diagram (docs/source/Class Diagram by Mermaid.jpg, moodle/moodle.md section C).
 * ClassContractTest covers the operations; this test covers the attributes and the relationships/multiplicities.
 *
 * Deliberate mappings (documented in docs/class-diagram-mapping.md):
 *  - snake_case attributes become camelCase fields; composite keys (StockRecordId, ForecastId) carry sku/location(/period)
 *  - User subclasses (Administrator, Manager, WarehouseStaff, SalesPersonnel) are the Role enum + one service each
 *  - Notification.recipients is one Notification row per recipient (many-to-one User)
 *  - PurchaseOrder/SalesOrder.line_items are PoLineItem / SalesOrderLineItem entities
 */
class ClassDiagramStructureTest {

    static Stream<Arguments> attributes() {
        return Stream.of(
                Arguments.of("User", new String[]{"userId", "name", "email", "role", "hashedPassword", "status"}),
                Arguments.of("Product", new String[]{"skuId", "name", "category", "unitPrice", "reorderPoint", "unitOfMeasure"}),
                Arguments.of("StockRecord", new String[]{"id", "quantityOnHand", "quantityReserved", "lastUpdated"}),
                Arguments.of("StockRecordId", new String[]{"skuId", "locationId"}),
                Arguments.of("Forecast", new String[]{"id", "predictedDemand", "recommendedReorderQty"}),
                Arguments.of("ForecastId", new String[]{"skuId", "locationId", "forecastPeriod"}),
                Arguments.of("Supplier", new String[]{"supplierId", "name", "contactDetails", "rating", "leadTime", "procurementHistory"}),
                Arguments.of("PurchaseOrder", new String[]{"poId", "supplier", "lineItems", "status", "orderDate", "expectedDate"}),
                Arguments.of("SalesOrder", new String[]{"orderId", "channel", "customerInfo", "lineItems", "status", "paymentReference"}),
                Arguments.of("Notification", new String[]{"notificationId", "type", "channel", "user", "message", "timestamp", "status"})
        );
    }

    @ParameterizedTest(name = "{0} has every diagram attribute")
    @MethodSource("attributes")
    @DisplayName("Every attribute on the class diagram exists on the matching entity")
    void attributesExist(String entity, String[] expected) throws Exception {
        Class<?> c = Class.forName("com.isms.model." + entity);
        for (String name : expected) {
            assertTrue(Arrays.stream(c.getDeclaredFields()).anyMatch(f -> f.getName().equals(name)),
                    entity + " is missing diagram attribute: " + name);
        }
    }

    private static void assertAssociation(String owner, String field, Class<? extends Annotation> kind, String targetType) throws Exception {
        Field f = Class.forName("com.isms.model." + owner).getDeclaredField(field);
        assertNotNull(f.getAnnotation(kind), owner + "." + field + " must be @" + kind.getSimpleName());
        String type = f.getGenericType().getTypeName();
        assertTrue(type.endsWith(targetType) || type.contains("." + targetType + ">") || type.endsWith("." + targetType),
                owner + "." + field + " should reference " + targetType + " but is " + type);
    }

    @Test
    @DisplayName("Class-diagram relationships and multiplicities are mapped as JPA associations")
    void relationships() throws Exception {
        // Product 1 --- 1..* StockRecord ("tracked")
        assertAssociation("StockRecord", "product", ManyToOne.class, "Product");
        // Product 1 --- 0..* Forecast ("analyzed")
        assertAssociation("Forecast", "product", ManyToOne.class, "Product");
        // Supplier 1 --- 0..* PurchaseOrder ("fulfills")
        assertAssociation("PurchaseOrder", "supplier", ManyToOne.class, "Supplier");
        // PurchaseOrder * --- 1..* Product ("contains") via PoLineItem
        assertAssociation("PurchaseOrder", "lineItems", OneToMany.class, "PoLineItem");
        assertAssociation("PoLineItem", "purchaseOrder", ManyToOne.class, "PurchaseOrder");
        assertAssociation("PoLineItem", "product", ManyToOne.class, "Product");
        // SalesOrder * --- 1..* Product ("contains") via SalesOrderLineItem
        assertAssociation("SalesOrder", "lineItems", OneToMany.class, "SalesOrderLineItem");
        assertAssociation("SalesOrderLineItem", "salesOrder", ManyToOne.class, "SalesOrder");
        assertAssociation("SalesOrderLineItem", "product", ManyToOne.class, "Product");
        // Manager 1 --- 0..* PurchaseOrder ("approves"); WarehouseStaff 1 --- 0..* PurchaseOrder ("receives")
        assertAssociation("PurchaseOrder", "manager", ManyToOne.class, "User");
        assertAssociation("PurchaseOrder", "warehouseStaff", ManyToOne.class, "User");
        // User 1 --- 0..* Notification ("receives")
        assertAssociation("Notification", "user", ManyToOne.class, "User");
    }

    @Test
    @DisplayName("User generalization: exactly four specialised roles (Administrator, Manager, Warehouse Staff, Sales Personnel)")
    void userSpecializations() throws Exception {
        Class<?> role = Class.forName("com.isms.model.enums.Role");
        String[] names = Arrays.stream(role.getEnumConstants()).map(Object::toString).sorted().toArray(String[]::new);
        assertEquals(4, names.length, "Role enum must contain the four specialised users: " + Arrays.toString(names));
    }
}
