package com.isms.domain;

import com.isms.audit.AuditLogger;
import com.isms.error.ApiException;
import com.isms.model.Supplier;
import com.isms.model.User;
import com.isms.model.enums.PoStatus;
import com.isms.model.enums.Role;
import com.isms.model.enums.UserStatus;
import com.isms.repository.PurchaseOrderRepository;
import com.isms.repository.SupplierRepository;
import com.isms.repository.UserRepository;
import com.isms.security.LoginAttemptCache;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AdministratorService {

    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptCache loginAttemptCache;
    private final AuditLogger auditLogger;

    public AdministratorService(
            UserRepository userRepository,
            SupplierRepository supplierRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            PasswordEncoder passwordEncoder,
            LoginAttemptCache loginAttemptCache,
            AuditLogger auditLogger
    ) {
        this.userRepository = userRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptCache = loginAttemptCache;
        this.auditLogger = auditLogger;
    }

    public User assignRole(String userId, Role newRole) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        Role oldRole = user.getRole();
        user.setRole(newRole);
        User saved = userRepository.save(user);

        auditLogger.log(userId, "ROLE_ASSIGNED", "users", Map.of(
                "old_role", oldRole.getValue(),
                "new_role", newRole.getValue()
        ));
        return saved;
    }

    public Supplier deactivateSupplier(String supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found"));

        // BR-5 / C2.12: Blocked if there are open POs (Draft, Pending Approval, Approved, Partially Received)
        boolean hasOpenPos = purchaseOrderRepository.findBySupplierSupplierId(supplierId).stream()
                .anyMatch(po -> po.getStatus() == PoStatus.DRAFT ||
                                po.getStatus() == PoStatus.PENDING_APPROVAL ||
                                po.getStatus() == PoStatus.APPROVED ||
                                po.getStatus() == PoStatus.PARTIALLY_RECEIVED);

        if (hasOpenPos) {
            throw new ApiException(HttpStatus.CONFLICT, "OPEN_POS_EXIST", "Cannot deactivate supplier with active or open purchase orders");
        }

        supplier.setIsActive(false);
        Supplier saved = supplierRepository.save(supplier);
        auditLogger.log("admin", "SUPPLIER_DEACTIVATED", "suppliers", Map.of("supplier_id", supplierId));
        return saved;
    }

    public List<User> listUsers() {
        return userRepository.findAll();
    }

    public User createUser(String userId, String name, String email, Role role, String plainPassword) {
        if (userRepository.findByUserId(userId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_ID_EXISTS", "User ID already exists");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email already exists");
        }

        User user = new User(userId, name, email, role, passwordEncoder.encode(plainPassword), UserStatus.ACTIVE);
        User saved = userRepository.save(user);
        auditLogger.log(userId, "USER_CREATED", "users", Map.of("role", role.getValue()));
        return saved;
    }

    public User updateUserStatus(String userId, UserStatus status) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        user.setStatus(status);
        if (status == UserStatus.ACTIVE) {
            loginAttemptCache.reset(user.getUserId());
            loginAttemptCache.reset(user.getEmail());
        }
        User saved = userRepository.save(user);
        auditLogger.log(userId, "STATUS_UPDATED", "users", Map.of("status", status.getValue()));
        return saved;
    }
}
