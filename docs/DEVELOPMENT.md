# NutriCan PT - Development Guide

## 1. Getting Started

### 1.1 Prerequisites

Before starting development, ensure you have:

| Software | Version | Installation |
|----------|---------|--------------|
| Java JDK | 17+ | [Adoptium](https://adoptium.net/) |
| Node.js | 18+ | [Node.js](https://nodejs.org/) |
| Maven | 3.9+ | [Maven](https://maven.apache.org/) |
| Git | 2.40+ | [Git](https://git-scm.com/) |
| Docker | 24+ | [Docker](https://docker.com/) |

### 1.2 Clone & Setup

```bash
# Clone repository
git clone <repository-url>
cd nutrican-pt-workspace

# Install frontend dependencies
cd nutican-fe
npm install
```

### 1.3 Environment Configuration

#### Backend (.env)

```bash
cd nutrican-be
cat > .env << EOF
# Database
POSTGRES_DB=nutrican_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# JWT
JWT_SECRET_KEY=your_super_secret_key_at_least_256_bits_long_for_security
JWT_EXPIRATION_MS=3600000

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET_NAME=nutrican

# Server
SERVER_PORT=8080

# Ollama
OLLAMA_PORT=11434
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
EOF
```

#### Frontend (.env)

```bash
cd nutican-fe
cat > .env << EOF
VITE_API_URL=http://localhost:8080/api/v1
EOF
```

### 1.4 Start Services

```bash
cd nutrican-be

# Start infrastructure
docker-compose up -d

# Verify services
docker ps
```

### 1.5 Run Backend

```bash
cd nutrican-be
./mvnw spring-boot:run
```

Backend runs at `http://localhost:8080`

### 1.6 Run Frontend

```bash
cd nutican-fe
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 2. Project Structure

### 2.1 Backend (Maven Multi-Module)

```
nutrican-be/
├── pom.xml                          # Parent POM
├── nutritiontrack-module-core/      # Shared code
│   ├── pom.xml
│   └── src/main/java/
│       └── com/sba/nutrican_be/core/
│           ├── entity/              # JPA Entities
│           ├── repository/          # Spring Data Repositories
│           ├── enums/               # Enumerations
│           ├── util/                # Utilities
│           ├── dto/                 # Common DTOs
│           ├── service/             # Shared services
│           └── exception/           # Exception handling
│
├── nutritiontrack-module-auth/       # Authentication
├── nutritiontrack-module-user-profile/ # User profiles
├── nutritiontrack-module-diet-tracker/ # Diet tracking
├── nutritiontrack-module-ai-gateway/   # AI integration
├── nutritiontrack-module-pt-management/ # PT workspace
├── nutritiontrack-module-admin/       # Admin features
│
└── nutritiontrack-module-application/  # Main entry point
    └── src/main/java/com/sba/nutrican_be/
        └── NutritionTrackApplication.java
```

### 2.2 Frontend (React)

```
nutican-fe/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── stores/         # Zustand stores
│   ├── hooks/          # Custom hooks
│   ├── App.jsx         # Router
│   └── main.jsx        # Entry point
├── public/
├── package.json
└── vite.config.js
```

---

## 3. Backend Development

### 3.1 Creating a New Module

#### Step 1: Create Module Directory

```bash
cd nutrican-be
mkdir nutritiontrack-module-newfeature
```

#### Step 2: Create pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.sba</groupId>
        <artifactId>nutrican-be</artifactId>
        <version>0.0.1-SNAPSHOT</version>
    </parent>

    <artifactId>nutritiontrack-module-newfeature</artifactId>
    <name>New Feature Module</name>

    <dependencies>
        <!-- Dependencies from parent -->
        <dependency>
            <groupId>com.sba</groupId>
            <artifactId>nutritiontrack-module-core</artifactId>
        </dependency>
    </dependencies>
</project>
```

#### Step 3: Create Package Structure

```bash
mkdir -p nutritiontrack-module-newfeature/src/main/java/com/sba/nutrican_be/newfeature/{controller,service,dto}
mkdir -p nutritiontrack-module-newfeature/src/main/resources
```

#### Step 4: Add to Parent POM

```xml
<modules>
    <!-- existing modules -->
    <module>nutritiontrack-module-newfeature</module>
</modules>
```

### 3.2 Creating a New Entity

```java
// src/main/java/com/sba/nutrican_be/core/entity/NewEntity.java
package com.sba.nutrican_be.core.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "new_entities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewEntity extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NewEntityStatus status;

    public enum NewEntityStatus {
        ACTIVE, INACTIVE, PENDING
    }
}
```

### 3.3 Creating a Repository

```java
// src/main/java/com/sba/nutrican_be/core/repository/NewEntityRepository.java
package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.NewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface NewEntityRepository extends JpaRepository<NewEntity, UUID> {

    List<NewEntity> findByUserId(UUID userId);

    @Query("SELECT n FROM NewEntity n WHERE n.status = :status")
    List<NewEntity> findByStatus(NewEntity.NewEntityStatus status);

    boolean existsByNameAndUserId(String name, UUID userId);
}
```

### 3.4 Creating a Service

#### Service Interface

```java
// src/main/java/com/sba/nutrican_be/newfeature/service/NewFeatureService.java
package com.sba.nutrican_be.newfeature.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.newfeature.dto.NewEntityResponse;
import java.util.UUID;

public interface NewFeatureService {

    ApiResponse<NewEntityResponse> create(UUID userId, CreateRequest request);

    ApiResponse<NewEntityResponse> getById(UUID id);

    ApiResponse<List<NewEntityResponse>> getByUserId(UUID userId);

    ApiResponse<Void> delete(UUID id);
}
```

#### Service Implementation

```java
// src/main/java/com/sba/nutrican_be/newfeature/service/NewFeatureServiceImpl.java
package com.sba.nutrican_be.newfeature.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.NewEntity;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.NewEntityRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NewFeatureServiceImpl implements NewFeatureService {

    private final NewEntityRepository newEntityRepository;
    private final UserRepository userRepository;

    @Override
    public ApiResponse<NewEntityResponse> create(UUID userId, CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        NewEntity entity = NewEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .user(user)
                .status(NewEntity.NewEntityStatus.ACTIVE)
                .build();

        NewEntity saved = newEntityRepository.save(entity);
        return ApiResponse.success(toResponse(saved), "Created successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<NewEntityResponse> getById(UUID id) {
        NewEntity entity = newEntityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entity", id));
        return ApiResponse.success(toResponse(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<NewEntityResponse>> getByUserId(UUID userId) {
        List<NewEntityResponse> entities = newEntityRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(entities);
    }

    @Override
    public ApiResponse<Void> delete(UUID id) {
        if (!newEntityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Entity", id);
        }
        newEntityRepository.deleteById(id);
        return ApiResponse.success(null, "Deleted successfully");
    }

    private NewEntityResponse toResponse(NewEntity entity) {
        return NewEntityResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(entity.getStatus().name())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
```

### 3.5 Creating a Controller

```java
// src/main/java/com/sba/nutrican_be/newfeature/controller/NewFeatureController.java
package com.sba.nutrican_be.newfeature.controller;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.newfeature.dto.CreateRequest;
import com.sba.nutrican_be.newfeature.dto.NewEntityResponse;
import com.sba.nutrican_be.newfeature.service.NewFeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/newfeature")
@RequiredArgsConstructor
public class NewFeatureController {

    private final NewFeatureService newFeatureService;

    @PostMapping
    public ResponseEntity<ApiResponse<NewEntityResponse>> create(
            @AuthenticationPrincipal User user,
            @RequestBody @Valid CreateRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(newFeatureService.create(user.getId(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NewEntityResponse>> getById(
            @PathVariable UUID id) {
        return ResponseEntity.ok(newFeatureService.getById(id));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<NewEntityResponse>>> getMyEntities(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(newFeatureService.getByUserId(user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id) {
        return ResponseEntity.ok(newFeatureService.delete(id));
    }
}
```

### 3.6 Creating DTOs

```java
// Request DTO
package com.sba.nutrican_be.newfeature.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    private String description;
}

// Response DTO
package com.sba.nutrican_be.newfeature.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NewEntityResponse {
    private UUID id;
    private String name;
    private String description;
    private String status;
    private LocalDateTime createdAt;
}
```

### 3.7 Adding Security

```java
// In controller
@PostMapping
@PreAuthorize("hasRole('CUSTOMER') or hasRole('ADMIN')")
public ResponseEntity<ApiResponse<NewEntityResponse>> create(...) {
    // ...
}

// In SecurityConfig (auth module)
.requestMatchers("/api/v1/newfeature/**").authenticated()
```

---

## 4. Frontend Development

### 4.1 Creating a New Service

```javascript
// src/services/newFeatureService.js
import api from './api';

export const newFeatureService = {
  create: (data) => api.post('/newfeature', data),
  getById: (id) => api.get(`/newfeature/${id}`),
  getMyEntities: () => api.get('/newfeature/my'),
  delete: (id) => api.delete(`/newfeature/${id}`),
};
```

### 4.2 Creating a Zustand Store

```javascript
// src/stores/newFeatureStore.js
import { create } from 'zustand';

const useNewFeatureStore = create((set, get) => ({
  entities: [],
  currentEntity: null,
  isLoading: false,
  error: null,

  setEntities: (entities) => set({ entities }),
  setCurrentEntity: (entity) => set({ currentEntity: entity }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  create: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await newFeatureService.create(data);
      const entity = response.data.data;
      set((state) => ({
        entities: [entity, ...state.entities],
        isLoading: false,
      }));
      return entity;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMyEntities: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await newFeatureService.getMyEntities();
      set({ entities: response.data.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  delete: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await newFeatureService.delete(id);
      set((state) => ({
        entities: state.entities.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

### 4.3 Creating a Page

```jsx
// src/pages/NewFeaturePage.jsx
import { useEffect } from 'react';
import { useNewFeatureStore } from '../stores/newFeatureStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const NewFeaturePage = () => {
  const { entities, isLoading, fetchMyEntities, deleteEntity } = useNewFeatureStore();

  useEffect(() => {
    fetchMyEntities();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Entities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : entities.length === 0 ? (
            <div>No entities found</div>
          ) : (
            <ul className="space-y-4">
              {entities.map((entity) => (
                <li key={entity.id} className="flex items-center justify-between">
                  <span>{entity.name}</span>
                  <Button
                    variant="destructive"
                    onClick={() => deleteEntity(entity.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewFeaturePage;
```

### 4.4 Adding Route

```jsx
// src/App.jsx
import NewFeaturePage from './pages/NewFeaturePage';

const router = createBrowserRouter([
  // ... existing routes
  {
    path: '/newfeature',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
        <NewFeaturePage />
      </ProtectedRoute>
    ),
  },
]);
```

### 4.5 Creating Components

```jsx
// src/components/common/EntityCard.jsx
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export const EntityCard = ({ entity, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{entity.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{entity.description}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onEdit(entity)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={() => onDelete(entity.id)}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 5. Testing

### 5.1 Backend Testing

```java
// src/test/java/com/sba/nutrican_be/newfeature/service/NewFeatureServiceTest.java
package com.sba.nutrican_be.newfeature.service;

import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewFeatureServiceTest {

    @Mock
    private NewEntityRepository newEntityRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NewFeatureServiceImpl service;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .build();
    }

    @Test
    void create_ShouldCreateEntity() {
        // Given
        CreateRequest request = new CreateRequest();
        request.setName("Test Entity");
        request.setDescription("Test Description");

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(newEntityRepository.save(any())).thenAnswer(inv -> {
            NewEntity entity = inv.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        // When
        var result = service.create(userId, request);

        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getData().getName()).isEqualTo("Test Entity");
    }
}
```

### 5.2 Frontend Testing

```javascript
// src/__tests__/NewFeaturePage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NewFeaturePage } from '../pages/NewFeaturePage';
import { useNewFeatureStore } from '../stores/newFeatureStore';

jest.mock('../stores/newFeatureStore');

describe('NewFeaturePage', () => {
  beforeEach(() => {
    useNewFeatureStore.mockReturnValue({
      entities: [],
      isLoading: false,
      fetchMyEntities: jest.fn(),
      deleteEntity: jest.fn(),
    });
  });

  it('renders loading state', () => {
    useNewFeatureStore.mockReturnValue({
      entities: [],
      isLoading: true,
      fetchMyEntities: jest.fn(),
      deleteEntity: jest.fn(),
    });

    render(<NewFeaturePage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders entities list', () => {
    useNewFeatureStore.mockReturnValue({
      entities: [{ id: '1', name: 'Test' }],
      isLoading: false,
      fetchMyEntities: jest.fn(),
      deleteEntity: jest.fn(),
    });

    render(<NewFeaturePage />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### 5.3 Running Tests

```bash
# Backend
cd nutrican-be
./mvnw test

# Frontend
cd nutrican-fe
npm test
```

---

## 6. Code Style

### 6.1 Backend (Java)

Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html):

- 4 spaces indentation
- 100 character line limit
- Javadoc for public classes/methods
- Lombok for boilerplate

### 6.2 Frontend (JavaScript/React)

- 2 spaces indentation
- Single quotes for strings
- ES6+ features
- Functional components for React
- Hooks for state management

### 6.3 ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  rules: {
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
  },
};
```

---

## 7. Git Workflow

### 7.1 Branch Naming

```
feature/module-name
feature/feature-name
bugfix/issue-description
hotfix/critical-fix
```

### 7.2 Commit Messages

```
feat(module): add new feature
fix(controller): resolve issue with endpoint
refactor(service): improve performance
docs(readme): update installation guide
test(service): add unit tests
```

### 7.3 Pull Request

```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "feat(module): add new feature"

# Push and create PR
git push origin feature/new-feature
```

---

## 8. Debugging

### 8.1 Backend Debug

#### IntelliJ IDEA

1. Add breakpoints in code
2. Run in Debug mode
3. Attach to process or use port 5005

#### Command Line

```bash
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

### 8.2 Frontend Debug

#### React DevTools

Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.

#### Network Debugging

```javascript
// Enable logging in api.js
api.interceptors.request.use((config) => {
  console.log('Request:', config);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('Response:', response);
    return response;
  },
  (error) => {
    console.error('Error:', error);
    return Promise.reject(error);
  }
);
```

---

## 9. Performance Tips

### 9.1 Backend

- Use `@Transactional(readOnly = true)` for read operations
- Use pagination for list endpoints
- Use database indexes for frequently queried columns
- Use `@EntityGraph` for avoiding N+1 queries

### 9.2 Frontend

- Use React.memo for expensive components
- Use useMemo/useCallback for stable references
- Lazy load routes with React.lazy
- Optimize images with proper sizing

---

## 10. Common Issues & Solutions

### 10.1 Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs nutrican-postgres

# Verify connection string
psql -h localhost -U postgres -d nutrican_db
```

### 10.2 Module Not Found

```bash
# Rebuild parent pom
cd nutrican-be
./mvnw clean install

# Force update dependencies
./mvnw clean install -U
```

### 10.3 Frontend Build Errors

```bash
# Clear node_modules and reinstall
cd nutrican-fe
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## 11. Research Data Collection Workflow

Huong dan thu thap du lieu cho nghien cuu CV + RBL. Doc them: [RESEARCH.md](./RESEARCH.md), [RBL_METHODOLOGY.md](./RBL_METHODOLOGY.md).

### 11.1 Prerequisites

- Ollama chay voi `qwen2.5-vl`: `ollama pull qwen2.5-vl && ollama serve`
- Backend + frontend + PostgreSQL + MinIO dang hoat dong
- It nhat 1 tai khoan CUSTOMER + 1 PT + 1 ADMIN
- PT da duoc gan client (`pt_client_mappings`)

### 11.2 Thu thap log CV

1. Dang nhap CUSTOMER → `/diet`
2. Chon dung **meal source** (HOME_COOKED / RESTAURANT) va **complexity**
3. Upload anh mon an (< 500KB)
4. Kiem tra status:
   - `PT_REVIEWING` — san sang cho PT review
   - `DRAFT` — confidence thap; customer co the `submit-for-review`

**Tip:** Can doi nhom mau (an nha, nha hang, lau, buffet) de test cohort.

### 11.3 PT labeling

1. Dang nhap PT → `/pt/reviews`
2. (Tuy chon) Bat blind mode → nhap macro → reveal AI/DB
3. Review voi APPROVE / ADJUST_MACROS / REJECT
4. Chon `correctionReason` khi ADJUST hoac REJECT

### 11.4 Export dataset

**Qua UI (Admin):**
- `/admin` → section RBL Research → Download CSV / Report

**Qua API:**
```bash
# Stats
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/admin/rbl/stats"

# Export CSV
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/admin/rbl/export?cvOnly=true" \
  -o rbl_export.csv
```

### 11.5 Phan tich Python

```bash
pip install pandas
python -c "
import pandas as pd
df = pd.read_csv('rbl_export.csv', comment='#')
labeled = df[df['pt_action'].isin(['APPROVE', 'ADJUST_MACROS'])]
print('n=', len(labeled))
print('MAE kcal:', (labeled['ai_cal'] - labeled['pt_cal']).abs().mean())
"
```

### 11.6 Checklist truoc khi viet Results (luận văn)

- [ ] ≥ 30 labeled CV samples (`insufficientSample = false`)
- [ ] Ghi `model_version`, `prompt_version`, `food_db_version` tu CSV header
- [ ] Bao cao MAE theo cohort va meal_source
- [ ] Neu dung blind mode: so sanh `blindVsAiMae`
- [ ] Ghi nhan limitations (xem RESEARCH.md §9)

---

*Document Version: 2.1.0*
*Last Updated: 2026-06-12*
