package com.isms.config;

import com.isms.model.*;
import com.isms.model.enums.*;
import com.isms.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.IsoFields;
import java.util.*;

@Component
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final StockRecordRepository stockRecordRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PoLineItemRepository poLineItemRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderLineItemRepository salesOrderLineItemRepository;
    private final UserRepository userRepository;
    private final ForecastRepository forecastRepository;
    private final ForecastAccuracyRepository forecastAccuracyRepository;
    private final Environment environment;

    public DemoDataSeeder(
            ProductRepository productRepository,
            SupplierRepository supplierRepository,
            StockRecordRepository stockRecordRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PoLineItemRepository poLineItemRepository,
            SalesOrderRepository salesOrderRepository,
            SalesOrderLineItemRepository salesOrderLineItemRepository,
            UserRepository userRepository,
            ForecastRepository forecastRepository,
            ForecastAccuracyRepository forecastAccuracyRepository,
            Environment environment) {
        this.productRepository = productRepository;
        this.supplierRepository = supplierRepository;
        this.stockRecordRepository = stockRecordRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.poLineItemRepository = poLineItemRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.salesOrderLineItemRepository = salesOrderLineItemRepository;
        this.userRepository = userRepository;
        this.forecastRepository = forecastRepository;
        this.forecastAccuracyRepository = forecastAccuracyRepository;
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        boolean isDemoProfile = Arrays.asList(environment.getActiveProfiles()).contains("demo");
        long prodCount = productRepository.count();

        if (isDemoProfile || prodCount == 0) {
            log.info("[SEEDER] Triggering full demo seed (demoProfile={}, existingProducts={})...", isDemoProfile, prodCount);
            seedDemoData(false);
        } else {
            log.info("[SEEDER] Database already contains {} products. Skipping automatic demo seed.", prodCount);
        }
    }

    @Transactional
    public void seedDemoData(boolean force) {
        if (!force && productRepository.count() > 0) {
            log.info("[SEEDER] Products exist; verifying SKU-TEST presence...");
            if (!productRepository.existsById("SKU-TEST")) {
                Product testProd = new Product("SKU-TEST", "Marketplace Test Calibration Unit", "Electronics",
                        BigDecimal.valueOf(199.99), 10, "PCS");
                productRepository.save(testProd);
                StockRecordId sid = new StockRecordId("SKU-TEST", "WH-01");
                stockRecordRepository.save(new StockRecord(sid, testProd, 100, 0, OffsetDateTime.now()));
            }
            return;
        }

        log.info("[SEEDER] Seeding 5 suppliers...");
        List<Supplier> suppliers = List.of(
                new Supplier("SUP-001", "Acme Industrial Corp", "Contact: Alice Chen | +91 98201 11223 | info@acmeind.com",
                        BigDecimal.valueOf(4.80), 5, "Tier 1 Certified Vendor. Consistent high-volume supplier.\n", true),
                new Supplier("SUP-002", "Apex Electronics Ltd", "Contact: Rajiv Sharma | +91 98202 33445 | orders@apexelectronics.in",
                        BigDecimal.valueOf(4.25), 7, "Quality certified. Lead times stable within 7 days.\n", true),
                new Supplier("SUP-003", "Prime Global Logistics", "Contact: David Miller | +91 98203 55667 | dispatch@primelogistics.com",
                        BigDecimal.valueOf(3.90), 10, "Bulk hardware distributor.\n", true),
                new Supplier("SUP-004", "Silicon Valley Hardware", "Contact: Sunita Patel | +91 98204 77889 | sales@svhardware.com",
                        BigDecimal.valueOf(4.60), 4, "Rapid turnaround local component distributor.\n", true),
                new Supplier("SUP-005", "QuickParts Distribution", "Contact: Vikram Rao | +91 98205 99001 | contact@quickparts.org",
                        BigDecimal.valueOf(3.50), 14, "General spares supplier. Periodic transit delays.\n", true)
        );
        supplierRepository.saveAll(suppliers);

        log.info("[SEEDER] Seeding 30 SKUs + SKU-TEST across 5 categories...");
        List<Product> products = new ArrayList<>();
        // Electronics
        products.add(new Product("SKU-001", "Smart IoT Sensor Pro", "Electronics", BigDecimal.valueOf(1250.00), 20, "PCS"));
        products.add(new Product("SKU-002", "Industrial Gateway X1", "Electronics", BigDecimal.valueOf(4500.00), 10, "PCS"));
        products.add(new Product("SKU-003", "Embedded Microcontroller Kit", "Electronics", BigDecimal.valueOf(850.00), 25, "PCS"));
        products.add(new Product("SKU-004", "Pure Sine Wave Inverter 500W", "Electronics", BigDecimal.valueOf(3200.00), 15, "PCS"));
        products.add(new Product("SKU-005", "OLED Graphic Display Module", "Electronics", BigDecimal.valueOf(650.00), 30, "PCS"));
        products.add(new Product("SKU-006", "RF Transceiver Module 2.4GHz", "Electronics", BigDecimal.valueOf(420.00), 40, "PCS"));

        // Hardware
        products.add(new Product("SKU-007", "Aluminum Mounting Bracket Set", "Hardware", BigDecimal.valueOf(350.00), 50, "SET"));
        products.add(new Product("SKU-008", "Stainless Bolt Assortment M6", "Hardware", BigDecimal.valueOf(220.00), 60, "BOX"));
        products.add(new Product("SKU-009", "Steel Slotted DIN Rail 1m", "Hardware", BigDecimal.valueOf(180.00), 40, "MTR"));
        products.add(new Product("SKU-010", "IP67 Waterproof Enclosure", "Hardware", BigDecimal.valueOf(890.00), 20, "PCS"));
        products.add(new Product("SKU-011", "Heavy-Duty Continuous Hinge", "Hardware", BigDecimal.valueOf(420.00), 30, "PCS"));
        products.add(new Product("SKU-012", "Industrial Vibration Damper M8", "Hardware", BigDecimal.valueOf(150.00), 80, "PCS"));

        // Cables
        products.add(new Product("SKU-013", "Cat6A Shielded Patch Cable 2m", "Cables", BigDecimal.valueOf(180.00), 50, "PCS"));
        products.add(new Product("SKU-014", "Industrial Rugged USB-C 1.5m", "Cables", BigDecimal.valueOf(280.00), 40, "PCS"));
        products.add(new Product("SKU-015", "Shielded Twisted Pair RS-485 50m", "Cables", BigDecimal.valueOf(1400.00), 15, "ROLL"));
        products.add(new Product("SKU-016", "Heavy Duty Power Cord 16A", "Cables", BigDecimal.valueOf(340.00), 30, "PCS"));
        products.add(new Product("SKU-017", "Fiber Optic Duplex Patch LC-LC", "Cables", BigDecimal.valueOf(480.00), 25, "PCS"));
        products.add(new Product("SKU-018", "Ultra High Speed HDMI 2.1 3m", "Cables", BigDecimal.valueOf(380.00), 35, "PCS"));

        // Accessories
        products.add(new Product("SKU-019", "Thermal Conductive Paste 10g", "Accessories", BigDecimal.valueOf(190.00), 50, "TUBE"));
        products.add(new Product("SKU-020", "Braided Cable Sleeve 10m", "Accessories", BigDecimal.valueOf(260.00), 40, "ROLL"));
        products.add(new Product("SKU-021", "Anti-Static Grounding Strap", "Accessories", BigDecimal.valueOf(130.00), 60, "PCS"));
        products.add(new Product("SKU-022", "DIN Rail Screw Terminal Block", "Accessories", BigDecimal.valueOf(45.00), 120, "PCS"));
        products.add(new Product("SKU-023", "Heat Shrink Tubing Kit 100pcs", "Accessories", BigDecimal.valueOf(210.00), 50, "KIT"));
        products.add(new Product("SKU-024", "UV Resistant Nylon Cable Ties 100pk", "Accessories", BigDecimal.valueOf(95.00), 100, "PACK"));

        // Peripherals
        products.add(new Product("SKU-025", "2D QR & Barcode Handheld Scanner", "Peripherals", BigDecimal.valueOf(2400.00), 15, "PCS"));
        products.add(new Product("SKU-026", "Industrial Sealed Membrane Keyboard", "Peripherals", BigDecimal.valueOf(3100.00), 10, "PCS"));
        products.add(new Product("SKU-027", "Heavy Duty Trackball Mouse IP65", "Peripherals", BigDecimal.valueOf(1950.00), 12, "PCS"));
        products.add(new Product("SKU-028", "Direct Thermal Label Printer", "Peripherals", BigDecimal.valueOf(6200.00), 8, "PCS"));
        products.add(new Product("SKU-029", "RFID UHF Long-Range Reader", "Peripherals", BigDecimal.valueOf(7800.00), 6, "PCS"));
        products.add(new Product("SKU-030", "Optically Isolated USB-RS485 Adapter", "Peripherals", BigDecimal.valueOf(720.00), 30, "PCS"));

        // Calibration SKU for simulate endpoint
        products.add(new Product("SKU-TEST", "Marketplace Test Calibration Unit", "Electronics", BigDecimal.valueOf(199.99), 10, "PCS"));

        productRepository.saveAll(products);

        log.info("[SEEDER] Seeding stock records for WH-01 and STORE-01...");
        List<StockRecord> stocks = new ArrayList<>();
        for (Product p : products) {
            int onHandWh;
            int onHandStore;
            int reservedWh = 0;

            if ("SKU-001".equals(p.getSkuId())) {
                onHandWh = 12; // below reorder point 20 -> triggers reorder suggest!
                onHandStore = 5;
                reservedWh = 4;
            } else if ("SKU-007".equals(p.getSkuId())) {
                onHandWh = 0;  // out of stock!
                onHandStore = 2;
                reservedWh = 0;
            } else if ("SKU-013".equals(p.getSkuId())) {
                onHandWh = 35; // near reorder point 50
                onHandStore = 15;
                reservedWh = 8;
            } else {
                onHandWh = p.getReorderPoint() * 3 + 15;
                onHandStore = p.getReorderPoint() + 5;
                reservedWh = (p.getReorderPoint() % 3 == 0) ? 5 : 0;
            }

            stocks.add(new StockRecord(new StockRecordId(p.getSkuId(), "WH-01"), p, onHandWh, reservedWh, OffsetDateTime.now()));
            stocks.add(new StockRecord(new StockRecordId(p.getSkuId(), "STORE-01"), p, onHandStore, 0, OffsetDateTime.now()));
        }
        stockRecordRepository.saveAll(stocks);

        log.info("[SEEDER] Seeding purchase orders and history...");
        User manager = userRepository.findByRole(Role.MANAGER).stream().findFirst().orElse(null);
        User warehouseStaff = userRepository.findByRole(Role.WAREHOUSE_STAFF).stream().findFirst().orElse(null);

        // Seed 4 completed POs for suppliers to establish delivery history and ratings
        for (int i = 0; i < 4; i++) {
            Supplier s = suppliers.get(i % suppliers.size());
            String poId = "PO-HIST-" + (1001 + i);
            LocalDate orderDate = LocalDate.now().minusDays(30 + (i * 15));
            LocalDate expDate = orderDate.plusDays(s.getLeadTime());
            PurchaseOrder po = new PurchaseOrder(poId, s, PoStatus.RECEIVED, orderDate, expDate, manager, warehouseStaff);
            purchaseOrderRepository.save(po);

            Product p1 = products.get(i * 3);
            Product p2 = products.get(i * 3 + 1);
            PoLineItem line1 = new PoLineItem(new PoLineItemId(poId, p1.getSkuId()), po, p1, 50, 50, OffsetDateTime.now().minusDays(20));
            PoLineItem line2 = new PoLineItem(new PoLineItemId(poId, p2.getSkuId()), po, p2, 40, 40, OffsetDateTime.now().minusDays(20));
            poLineItemRepository.saveAll(List.of(line1, line2));
        }

        // Seed 1 Pending Approval PO
        PurchaseOrder pendingPo = new PurchaseOrder("PO-OPEN-2001", suppliers.get(0), PoStatus.PENDING_APPROVAL,
                LocalDate.now().minusDays(2), LocalDate.now().plusDays(5), null, null);
        purchaseOrderRepository.save(pendingPo);
        PoLineItem pendingLine = new PoLineItem(new PoLineItemId("PO-OPEN-2001", "SKU-001"), pendingPo, products.get(0), 40, 0, null);
        poLineItemRepository.save(pendingLine);

        log.info("[SEEDER] Seeding 52 weeks of historical sales data for Holt-Winters model...");
        Random rng = new Random(42); // deterministic seed for reproducibility
        String[] channels = {"physical", "storefront", "marketplace:amazon", "marketplace:flipkart"};

        List<SalesOrder> salesOrders = new ArrayList<>();
        List<SalesOrderLineItem> salesLineItems = new ArrayList<>();

        LocalDate today = LocalDate.now();
        // Generate orders spanning the past 52 weeks
        for (int week = 52; week >= 1; week--) {
            LocalDate weekStart = today.minusWeeks(week);
            int weekOfYear = weekStart.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);

            // Seasonality factor (peaks during holiday/festival period weeks 40-48)
            double seasonalFactor = 1.0;
            if (weekOfYear >= 40 && weekOfYear <= 48) {
                seasonalFactor = 1.45;
            } else if (weekOfYear >= 15 && weekOfYear <= 20) {
                seasonalFactor = 1.20;
            }

            int ordersThisWeek = (int) Math.round((5 + rng.nextInt(6)) * seasonalFactor);
            for (int o = 0; o < ordersThisWeek; o++) {
                String orderId = String.format("ORD-W%02d-%03d", week, o + 1);
                String channel = channels[rng.nextInt(channels.length)];
                String customer = "Customer " + (rng.nextInt(500) + 1) + ", Zone " + (rng.nextInt(5) + 1);
                OffsetDateTime orderTime = weekStart.plusDays(rng.nextInt(7)).atTime(10 + rng.nextInt(8), rng.nextInt(60)).atOffset(OffsetDateTime.now().getOffset());

                SalesOrder so = new SalesOrder(orderId, channel, customer, SalesStatus.COMPLETED, "PAY-SEED-" + orderId, orderTime);
                salesOrders.add(so);

                // Add 1 to 3 line items
                int numLines = 1 + rng.nextInt(3);
                for (int l = 1; l <= numLines; l++) {
                    Product prod = products.get(rng.nextInt(products.size() - 1)); // pick any SKU except calibration
                    int qty = 1 + rng.nextInt(5);
                    String loc = (rng.nextBoolean()) ? "WH-01" : "STORE-01";

                    SalesOrderLineItemId lineId = new SalesOrderLineItemId(orderId, prod.getSkuId(), l);
                    SalesOrderLineItem item = new SalesOrderLineItem(lineId, so, prod, loc, qty, prod.getUnitPrice());
                    salesLineItems.add(item);
                }
            }
        }

        salesOrderRepository.saveAll(salesOrders);
        salesOrderLineItemRepository.saveAll(salesLineItems);

        log.info("[SEEDER] Seeding initial forecast records & accuracy tracking...");
        int currentWeek = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        String currentPeriod = today.getYear() + "-W" + (currentWeek < 10 ? "0" + currentWeek : currentWeek);
        String nextPeriod = today.getYear() + "-W" + ((currentWeek + 1) < 10 ? "0" + (currentWeek + 1) : (currentWeek + 1));

        List<Forecast> initialForecasts = new ArrayList<>();
        List<ForecastAccuracy> initialAccuracy = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            Product p = products.get(i);
            int predicted = p.getReorderPoint() * 2 + 5;
            int reorderQty = Math.max(0, (predicted - 10) + p.getReorderPoint());

            Forecast f1 = new Forecast(new ForecastId(p.getSkuId(), "WH-01", nextPeriod), p, predicted, reorderQty);
            initialForecasts.add(f1);

            int actual = (int) Math.round(predicted * (0.85 + (rng.nextDouble() * 0.3)));
            int absErr = Math.abs(predicted - actual);
            double pctErr = predicted > 0 ? ((double) absErr / predicted) * 100.0 : 0.0;
            ForecastAccuracy acc = new ForecastAccuracy(
                    "ACC-SEED-" + (i + 1),
                    p,
                    currentPeriod,
                    predicted,
                    actual,
                    absErr,
                    BigDecimal.valueOf(pctErr).setScale(2, RoundingMode.HALF_UP),
                    OffsetDateTime.now().minusDays(3)
            );
            initialAccuracy.add(acc);
        }

        forecastRepository.saveAll(initialForecasts);
        forecastAccuracyRepository.saveAll(initialAccuracy);

        log.info("[SEEDER] Successfully seeded 5 suppliers, 31 SKUs, 62 stock records, 5 POs, {} sales orders, {} line items, and initial forecasts!",
                salesOrders.size(), salesLineItems.size());
    }
}
