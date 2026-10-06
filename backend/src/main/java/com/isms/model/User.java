package com.isms.model;

import com.isms.model.enums.Role;
import com.isms.model.enums.UserStatus;
import jakarta.persistence.*;

import java.util.Objects;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "user_id", length = 32, nullable = false)
    private String userId;

    @Column(name = "name", length = 120, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "role", length = 20, nullable = false)
    private Role role;

    @Column(name = "hashed_password", length = 255, nullable = false)
    private String hashedPassword;

    @Column(name = "status", length = 10, nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    public User() {}

    public User(String userId, String name, String email, Role role, String hashedPassword, UserStatus status) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.hashedPassword = hashedPassword;
        this.status = status != null ? status : UserStatus.ACTIVE;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getHashedPassword() {
        return hashedPassword;
    }

    public void setHashedPassword(String hashedPassword) {
        this.hashedPassword = hashedPassword;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return Objects.equals(userId, user.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId);
    }
}
