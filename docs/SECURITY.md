# NutriCan PT - Security Documentation

## 1. Security Overview

NutriCan PT implements a comprehensive security architecture using industry-standard practices to protect user data and system resources.

### 1.1 Security Principles

| Principle | Implementation |
|-----------|----------------|
| **Defense in Depth** | Multiple layers of security (network, application, data) |
| **Least Privilege** | Role-based access control with minimal permissions |
| **Secure by Default** | Secure configuration out of the box |
| **Fail Securely** | Default to deny on errors |

---

## 2. Authentication

### 2.1 JWT-Based Authentication

The application uses JSON Web Tokens (JWT) for stateless authentication.

#### Token Types

| Token | Purpose | Expiration | Storage |
|-------|---------|------------|---------|
| Access Token | API authorization | 1 hour (configurable) | Zustand store (serialized to non-HttpOnly cookie for hydration) |
| Refresh Token | Obtain new access token | 7 days | HttpOnly, Secure cookie (path=/, SameSite=Strict) |

#### Token Structure

**Access Token Payload:**
```json
{
  "sub": "user@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "CUSTOMER",
  "iat": 1706400000,
  "exp": 1706403600
}
```

**Refresh Token Payload:**
```json
{
  "sub": "user@example.com",
  "type": "refresh",
  "iat": 1706400000,
  "exp": 1707007200
}
```

### 2.2 Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Client  │     │   Backend   │     │   Database  │     │   JWT       │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
     │                  │                   │                   │
     │  POST /login     │                   │                   │
     │  {email, password}                  │                   │
     │─────────────────>│                   │                   │
     │                  │                   │                   │
     │                  │  Find User        │                   │
     │                  │───────────────────────────────────────>│
     │                  │                   │                   │
     │                  │  Validate Password (BCrypt)          │
     │                  │                   │                   │
     │                  │  Generate Tokens  │                   │
     │                  │───────────────────────────────────────>│
     │                  │                   │                   │
     │  Response        │                   │                   │
     │  {accessToken,   │                   │                   │
     │   refreshToken}  │                   │                   │
     │<─────────────────│                   │                   │
     │                  │                   │                   │
     │  API Request     │                   │                   │
     │  + Bearer Token   │                   │                   │
     │─────────────────>│                   │                   │
     │                  │                   │                   │
     │                  │  Validate JWT    │                   │
     │                  │───────────────────────────────────────>│
     │                  │                   │                   │
     │                  │  Load User       │                   │
     │                  │───────────────────────────────────────>│
     │                  │                   │                   │
     │  Response        │                   │                   │
     │<─────────────────│                   │                   │
```

### 2.3 Password Security

| Aspect | Implementation |
|--------|----------------|
| Hashing | BCrypt with cost factor 10 |
| Minimum Length | 8 characters |
| Required Characters | At least one uppercase, one lowercase, one digit |
| Storage | Never stored in plain text |

#### BCrypt Configuration

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
}
```

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

The application implements RBAC with four roles:

| Role | Description | Access Level |
|------|-------------|--------------|
| `CUSTOMER` | Regular user | Own data, diet tracking, marketplace |
| `PT_FREELANCE` | Unverified PT | PT workspace, assigned clients |
| `PT_CERTIFIED` | Verified PT | PT workspace, assigned clients |
| `ADMIN` | Administrator | Full system access |

### 3.2 Permission Matrix

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           PERMISSION MATRIX                                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Resource                  │ CUSTOMER │ PT_FREELANCE │ PT_CERTIFIED │ ADMIN │
├──────────────────────────┼──────────┼───────────────┼──────────────┼──────┤
│ Authentication            │          │               │              │       │
│   Login                  │    ✓     │       ✓       │       ✓      │   ✓   │
│   Register               │    ✓     │       ✓       │       ✓      │   ✓   │
├──────────────────────────┼──────────┼───────────────┼──────────────┼──────┤
│ Profile Management        │          │               │              │       │
│   View Own Profile       │    ✓     │       ✓       │       ✓      │   ✓   │
│   Update Own Profile     │    ✓     │       ✓       │       ✓      │   ✓   │
│   Upload Avatar          │    ✓     │       ✓       │       ✓      │   ✓   │
├──────────────────────────┼──────────┼───────────────┼──────────────┼──────┤
│ Diet Tracking            │          │               │              │       │
│   Create Diet Log        │    ✓     │       ✗       │       ✗      │   ✗   │
│   View Own Logs          │    ✓     │       ✗       │       ✗      │   ✗   │
│   Update Own Logs        │    ✓     │       ✗       │       ✗      │   ✗   │
│   Delete Own Logs        │    ✓     │       ✗       │       ✗      │   ✗   │
├──────────────────────────┼───────────────┼──────────────┼──────┤
│ Marketplace              │          │               │              │       │
│   Search PTs             │    ✓     │       ✓       │       ✓      │   ✓   │
│   View PT Details        │    ✓     │       ✓       │       ✓      │   ✓   │
│   Create Review          │    ✓     │       ✗       │       ✗      │   ✗   │
├──────────────────────────┼──────────┼───────────────┼──────────────┼──────┤
│ PT Workspace             │          │               │              │       │
│   View Clients           │    ✗     │       ✓       │       ✓      │   ✗   │
│   Review Diet Logs       │    ✗     │       ✓       │       ✓      │   ✗   │
│   Track Progress         │    ✗     │       ✓       │       ✓      │   ✗   │
├──────────────────────────┼──────────┼───────────────┼──────────────┼──────┤
│ Admin                    │          │               │              │       │
│   View Dashboard         │    ✗     │       ✗       │       ✗      │   ✓   │
│   Manage Users           │    ✗     │       ✗       │       ✗      │   ✓   │
│   Verify PTs             │    ✗     │       ✗       │       ✗      │   ✓   │
│   Manage SOS Tickets     │    ✗     │       ✗       │       ✗      │   ✓   │
└──────────────────────────┴──────────┴───────────────┴──────────────┴──────┘

✓ = Allowed, ✗ = Denied
```

### 3.3 Method-Level Security

```java
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")  // All endpoints require ADMIN role
public class AdminController {
    // ...
}

@RestController
@RequestMapping("/api/v1/workspace")
@PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")  // PT roles only
public class PtWorkspaceController {
    // ...
}
```

### 3.4 Ownership Validation

Users can only access their own resources:

```java
@PutMapping("/diet/logs/{id}")
public ResponseEntity<ApiResponse<DietLogResponse>> updateLog(
        @PathVariable UUID id,
        @AuthenticationPrincipal User user,
        @RequestBody @Valid UpdateDietLogRequest request) {
    
    DietLog log = dietLogRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("DietLog", id));
    
    // Ownership check
    if (!log.getCustomer().getId().equals(user.getId())) {
        throw new UnauthorizedException("You can only update your own logs");
    }
    
    // Update logic...
}
```

---

## 4. API Security

### 4.1 CORS Configuration

CORS is configured via `SecurityConfig.java` (primary) and reads allowed origins from the environment variable `${app.cors.allowed-origins}`. Both `allowedHeaders` and `exposedHeaders` are set via `SecurityConfig`. The `WebConfig.java` duplicate CORS mapping has been removed to avoid conflicts.

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(allowedOrigins); // from app.cors.allowed-origins
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);
    configuration.setExposedHeaders(List.of("Authorization", "Access-Token", "Refresh-Token"));
    // ...
}
```

> **Note:** In development, set `app.cors.allowed-origins=http://localhost:5173,http://localhost:3000,http://localhost:5174`. In production, replace with your actual domain(s).

### 4.2 Rate Limiting

Current implementation relies on:
- Spring Boot default connection handling
- Database connection pooling (HikariCP)
- Frontend rate limiting (debounce on inputs)

For production, a dedicated rate limiting filter should be added. Example with Bucket4j:

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    private final Bucket loginBucket = Bucket.builder()
        .addLimit(Bandwidth.classic(5, Refill.intervally(1, Duration.ofMinutes(1))))
        .build();

    @Override
    protected void doFilterInternal(...) {
        if (request.getRequestURI().contains("/auth/login")) {
            if (!loginBucket.tryConsume()) {
                response.setStatus(429);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

Alternatively, consider using:
- Spring Cloud Gateway with Redis-based rate limiting
- Third-party services (Cloudflare, etc.)

### 4.3 Input Validation

All user inputs are validated:

```java
// Request DTO with validation
@Data
public class RegisterRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    private String phoneNumber;
}

// Controller with validation
@PostMapping("/register")
public ResponseEntity<ApiResponse<AuthResponse>> register(
        @RequestBody @Valid RegisterRequest request) {
    // Validation happens automatically before method execution
}
```

### 4.4 SQL Injection Prevention

Using Spring Data JPA prevents SQL injection:

```java
// Safe - using parameterized queries
List<User> users = userRepository.findByEmail(email);

// Safe - using @Query with named parameters
@Query("SELECT u FROM User u WHERE u.email = :email")
User findByEmailQuery(@Param("email") String email);

// Safe - using query by method name
List<User> users = userRepository.findByRoleAndStatus(role, status);
```

---

## 5. Data Security

### 5.1 Sensitive Data Handling

| Data Type | Storage | Protection |
|-----------|---------|------------|
| Password | BCrypt Hash | One-way encryption |
| JWT Secret | Environment Variable | Not in code/config |
| Database Credentials | Environment Variable | Not in code |
| API Keys | Environment Variable | Not in code |
| File Uploads | MinIO with access control | Signed URLs |

### 5.2 File Upload Security

```java
// File size limits
spring.servlet.multipart.max-file-size=500KB
spring.servlet.multipart.max-request-size=10MB

// Allowed file types (validated in code)
public class FileValidationUtils {
    
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg",
        "image/png"
    );
    
    public static boolean isValidImageType(String contentType) {
        return ALLOWED_TYPES.contains(contentType);
    }
    
    public static boolean isValidFileSize(long size) {
        return size <= 500 * 1024; // 500KB
    }
}
```

### 5.3 MinIO Security

```java
// Presigned URLs for secure access
public String getPresignedUrl(String objectName) {
    return minioClient.getPresignedUrl(
        GetPresignedObjectUrlArgs.builder()
            .method(Method.GET)
            .bucket(bucketName)
            .object(objectName)
            .expiry(15, TimeUnit.MINUTES)
            .build()
    );
}
```

---

## 6. Network Security

### 6.1 HTTPS Configuration

Production should always use HTTPS:

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.nutrican.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 6.2 Headers

```java
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain)
            throws ServletException, IOException {
        
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        filterChain.doFilter(request, response);
    }
}
```

### 6.3 Firewall Rules

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 7. Secrets Management

### 7.1 Environment Variables

Never commit secrets to version control:

```bash
# .env (NOT committed to git)
POSTGRES_PASSWORD=super_secure_password
JWT_SECRET_KEY=your_very_long_secret_key_at_least_256_bits
MINIO_ROOT_PASSWORD=minio_secure_password
```

### 7.2 Git Ignore

```
# .gitignore
.env
*.env.local
*.env.production
```

### 7.3 Production Secrets

In production, use:
- Docker secrets
- Kubernetes secrets
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

---

## 8. Logging & Monitoring

### 8.1 Security Logging

```java
// Log authentication events
@Service
public class SecurityAuditService {
    
    private static final Logger auditLog = LoggerFactory.getLogger("SECURITY_AUDIT");
    
    public void logLogin(String email, boolean success) {
        auditLog.info("LOGIN attempt: email={}, success={}", email, success);
    }
    
    public void logFailedAuth(String email, String reason) {
        auditLog.warn("AUTH_FAILED: email={}, reason={}", email, reason);
    }
}
```

### 8.2 Log Events to Capture

| Event | Level | Data |
|-------|-------|------|
| Login attempt | INFO/WARN | email, success/failure |
| Logout | INFO | userId |
| Token refresh | DEBUG | userId |
| Permission denied | WARN | userId, resource, action |
| Suspicious activity | ERROR | details |

### 8.3 Health Checks

```bash
# Application health
curl http://localhost:8080/actuator/health

# Response
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

---

## 9. Security Checklist

### 9.1 Development

- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] Output encoding
- [ ] Parameterized queries
- [ ] Secure dependencies (no known CVEs)
- [ ] Code review for security issues

### 9.2 Configuration

- [ ] HTTPS enabled
- [ ] Strong JWT secret (256+ bits)
- [ ] CORS properly configured
- [ ] File upload limits set
- [ ] Security headers enabled
- [ ] Database credentials secured

### 9.3 Deployment

- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] SSL/TLS certificates valid
- [ ] Monitoring enabled
- [ ] Incident response plan

---

## 10. Security Best Practices

### 10.1 For Users

| Practice | Recommendation |
|----------|----------------|
| Password | Use unique, strong passwords |
| Sharing | Never share login credentials |
| Public WiFi | Avoid accessing sensitive data |
| Suspicious Activity | Report immediately |

### 10.2 For Developers

| Practice | Recommendation |
|----------|----------------|
| Dependencies | Keep updated, scan for CVEs |
| Code Review | Always review security-sensitive code |
| Secrets | Use environment variables, never hardcode |
| Error Handling | Don't expose sensitive information |
| Testing | Include security tests |

### 10.3 For Operations

| Practice | Recommendation |
|----------|----------------|
| Monitoring | Enable security monitoring |
| Patching | Apply security updates promptly |
| Backups | Regular, tested backups |
| Access | Principle of least privilege |
| Auditing | Regular security audits |

---

## 11. Security Testing

### 11.1 OWASP Top 10

| OWASP Category | Status |
|----------------|--------|
| A01: Broken Access Control | Implemented via RBAC |
| A02: Cryptographic Failures | BCrypt for passwords |
| A03: Injection | JPA prevents SQL injection |
| A04: Insecure Design | Reviewed |
| A05: Security Misconfiguration | Hardened configs |
| A06: Vulnerable Components | Dependency scanning |
| A07: Auth Failures | JWT with refresh tokens |
| A08: Data Integrity | Validated inputs |
| A09: Logging Failures | Security logging implemented |
| A10: SSRF | MinIO access controlled |

### 11.2 Security Testing Tools

```bash
# Dependency check
./mvnw dependency-check:check

# OWASP ZAP (DAST)
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
```

---

## 12. Incident Response

### 12.1 Response Procedure

1. **Identify** - Detect and confirm the incident
2. **Contain** - Prevent further damage
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Document** - Record lessons learned

### 12.2 Contact Information

| Contact | Purpose |
|---------|---------|
| Security Team | security@nutrican.com |
| Admin | Emergency access |

---

*Document Version: 2.0.0*
*Last Updated: 2026-06-04*
