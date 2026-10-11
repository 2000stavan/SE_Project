package com.isms.repository;

import com.isms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUserId(String userId);
    java.util.List<User> findByRole(com.isms.model.enums.Role role);

    default Optional<User> findByUserIdOrEmail(String identifier) {
        if (identifier == null) return Optional.empty();
        Optional<User> byId = findByUserId(identifier);
        if (byId.isPresent()) return byId;
        return findByEmail(identifier);
    }
}
