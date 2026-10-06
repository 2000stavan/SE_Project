package com.isms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ClassContractTest {

    static Stream<Arguments> contractMappings() {
        return Stream.of(
                Arguments.of("com.isms.domain.UserService", new String[]{"login", "logout", "resetPassword"}),
                Arguments.of("com.isms.domain.AdministratorService", new String[]{"assignRole", "deactivateSupplier"}),
                Arguments.of("com.isms.domain.ManagerService", new String[]{"approvePo", "rejectPo"}),
                Arguments.of("com.isms.domain.WarehouseStaffService", new String[]{"captureVoiceCommand", "receivePoConfirm"}),
                Arguments.of("com.isms.domain.SalesPersonnelService", new String[]{"logPhysicalSale"}),
                Arguments.of("com.isms.domain.ProductService", new String[]{"create", "update", "delete", "search"}),
                Arguments.of("com.isms.domain.StockRecordService", new String[]{"updateStock", "deductStock", "realtimeSync"}),
                Arguments.of("com.isms.domain.SupplierService", new String[]{"create", "edit", "trackPerformance", "search"}),
                Arguments.of("com.isms.domain.PurchaseOrderService", new String[]{"create", "approve", "reject", "receiveConfirm", "flagOverdue"}),
                Arguments.of("com.isms.domain.SalesOrderService", new String[]{"createOrder", "processWebhook", "processReturn", "generateInvoice"}),
                Arguments.of("com.isms.domain.ForecastService", new String[]{"generateDemand", "detectSeasonality", "recommendReorder"}),
                Arguments.of("com.isms.domain.NotificationService", new String[]{"triggerLowStock", "triggerShippingDelay", "sendAudioAlert"})
        );
    }

    @ParameterizedTest(name = "{0} must contain all diagram operations")
    @MethodSource("contractMappings")
    @DisplayName("Verify that every class-diagram method exists as a public method on the service class")
    void testDiagramOperationsExist(String serviceClassName, String[] expectedMethods) throws ClassNotFoundException {
        Class<?> serviceClass = Class.forName(serviceClassName);
        Method[] methods = serviceClass.getMethods();

        for (String expectedMethod : expectedMethods) {
            boolean found = Arrays.stream(methods)
                    .anyMatch(m -> m.getName().equals(expectedMethod) && Modifier.isPublic(m.getModifiers()));

            assertTrue(found, "Service class " + serviceClassName + " is missing public method: " + expectedMethod);
        }
    }
}
