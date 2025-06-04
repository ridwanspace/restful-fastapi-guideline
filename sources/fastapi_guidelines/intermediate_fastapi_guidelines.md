# RESTful API Design Guidelines for FastAPI

## Executive Summary

RESTful APIs serve as the backbone of modern web applications, providing a standardized way for systems to communicate over HTTP. This comprehensive guide establishes industry-standard practices for designing, implementing, and maintaining RESTful APIs using FastAPI, focusing on consistency, scalability, and developer experience. The guidelines emphasize practical patterns that have proven successful in production environments while avoiding common pitfalls that can lead to maintenance nightmares and poor user experience.

The principles outlined here prioritize clarity over cleverness, consistency over convenience, and long-term maintainability over short-term development speed. By following these standards, development teams can create APIs that are intuitive to use, easy to extend, and robust enough to handle enterprise-scale requirements. Each recommendation is backed by real-world FastAPI examples and includes performance considerations, security implications, and migration strategies.

## 1. URI Design & Naming Conventions

### Resource Naming Principles

RESTful URIs should represent resources (nouns) rather than actions (verbs). Use plural nouns for collections and singular nouns only when referring to a specific singleton resource or when the resource inherently represents a single entity.

**Core Rules:**
- Use lowercase letters with hyphens for multi-word resources
- Prefer plural nouns for collections: `/users`, `/orders`, `/products`
- Use nouns, not verbs: `/users` not `/getUsers`
- Be consistent across your entire API

### Hierarchy and Nested Resources

Design URI hierarchies that reflect logical relationships between resources. Limit nesting to 2-3 levels to maintain clarity and avoid overly complex paths.

```python
from fastapi import FastAPI, Path, Query
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI()

# Good: Clear hierarchy representing relationships
@app.get("/users/{user_id}/orders/{order_id}/items")
async def get_order_items(
    user_id: int = Path(..., description="User identifier"),
    order_id: int = Path(..., description="Order identifier")
):
    """Retrieve items for a specific user's order"""
    pass

# Good: Flat structure for independent resources
@app.get("/products")
async def get_products(
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None)
):
    """Retrieve products with optional filtering"""
    pass
```

### URI Design Examples

| ✅ Good Examples | Description |
|-----------------|-------------|
| `GET /api/v1/users` | Retrieve all users |
| `POST /api/v1/users` | Create a new user |
| `GET /api/v1/users/123` | Retrieve user with ID 123 |
| `PUT /api/v1/users/123/profile` | Update user's profile |
| `GET /api/v1/orders?status=pending` | Filter orders by status |

| ❌ Bad Examples | Problem |
|----------------|---------|
| `GET /api/v1/getUsers` | Uses verb instead of noun |
| `POST /api/v1/user` | Inconsistent singular/plural usage |
| `GET /api/v1/users/123/orders/456/items/789/details/shipping` | Too deeply nested |
| `DELETE /api/v1/deleteUserById/123` | Redundant verb and inconsistent pattern |
| `GET /api/v1/Users` | Inconsistent capitalization |

### Path Parameters vs Query Parameters

**Path Parameters**: Use for resource identification and hierarchical relationships.
**Query Parameters**: Use for filtering, sorting, pagination, and optional modifiers.

```python
from fastapi import FastAPI, Path, Query, Depends
from typing import Optional
from enum import Enum

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"

@app.get("/users/{user_id}/orders")
async def get_user_orders(
    user_id: int = Path(..., ge=1, description="User ID"),
    status: Optional[str] = Query(None, regex="^(pending|completed|cancelled)$"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at", regex="^(created_at|total_amount|status)$"),
    sort_order: SortOrder = Query(SortOrder.desc)
):
    """
    Retrieve orders for a specific user with filtering and pagination
    
    Path parameter: user_id (resource identifier)
    Query parameters: filtering, pagination, sorting options
    """
    pass
```

### Special Characters and Encoding

Handle special characters consistently and provide clear encoding guidelines:

```python
from fastapi import FastAPI, Query
from urllib.parse import unquote
import re

@app.get("/search")
async def search_resources(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    category: Optional[str] = Query(None, regex="^[a-zA-Z0-9_-]+$")
):
    """
    Search with proper encoding handling
    - Spaces should be URL encoded as %20 or +
    - Special characters must be properly encoded
    - Server automatically decodes URL-encoded parameters
    """
    # FastAPI automatically handles URL decoding
    decoded_query = unquote(q)  # Additional decoding if needed
    pass

# Example valid requests:
# GET /search?q=hello%20world&category=electronics
# GET /search?q=user%40example.com
```

---

## 2. HTTP Methods & Semantic Usage

### CRUD Operation Mapping

Each HTTP method has specific semantics that must be respected for predictable API behavior:

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None

class User(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    created_at: str

@app.post("/users", status_code=status.HTTP_201_CREATED, response_model=User)
async def create_user(user_data: UserCreate):
    """CREATE: Add new resource, return 201 with created resource"""
    # Implementation creates new user
    pass

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """READ: Retrieve specific resource, return 200 or 404"""
    pass

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_data: UserUpdate):
    """UPDATE: Replace entire resource, return 200 or 404"""
    pass

@app.patch("/users/{user_id}", response_model=User)
async def partial_update_user(user_id: int, user_data: UserUpdate):
    """PARTIAL UPDATE: Modify specific fields, return 200 or 404"""
    pass

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    """DELETE: Remove resource, return 204 or 404"""
    pass
```

### Idempotency and Safety

Understanding idempotency and safety is crucial for reliable API design:

**Safe Methods** (no side effects): GET, HEAD, OPTIONS
**Idempotent Methods** (same result on multiple calls): GET, PUT, DELETE, HEAD, OPTIONS
**Non-idempotent Methods**: POST, PATCH

```python
from fastapi import FastAPI, HTTPException, Header
from typing import Optional
import uuid

@app.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Idempotent operation - multiple identical requests have same effect
    Optional idempotency key for additional safety
    """
    # Check if operation was already performed with this key
    if idempotency_key:
        # Implementation checks for duplicate operations
        pass
    pass

@app.post("/orders")
async def create_order(
    order_data: dict,
    idempotency_key: str = Header(..., alias="Idempotency-Key")
):
    """
    Non-idempotent operation made safer with required idempotency key
    Prevents duplicate order creation
    """
    pass
```

### Bulk Operations

Handle bulk operations efficiently while maintaining clear semantics:

```python
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Union

class BulkUserCreate(BaseModel):
    users: List[UserCreate]

class BulkOperationResult(BaseModel):
    successful: List[Dict[str, Union[int, str]]]
    failed: List[Dict[str, Union[int, str, List[str]]]]
    total_processed: int

@app.post("/users/bulk", response_model=BulkOperationResult)
async def bulk_create_users(bulk_data: BulkUserCreate):
    """
    Bulk creation with detailed results
    Returns both successful and failed operations
    """
    results = BulkOperationResult(successful=[], failed=[], total_processed=0)
    
    for user_data in bulk_data.users:
        try:
            # Process each user
            results.successful.append({"id": 123, "username": user_data.username})
        except Exception as e:
            results.failed.append({
                "username": user_data.username,
                "errors": [str(e)]
            })
        results.total_processed += 1
    
    return results

@app.patch("/users/bulk")
async def bulk_update_users(updates: List[Dict[str, Union[int, Dict]]]):
    """Bulk updates with partial success handling"""
    pass

@app.delete("/users/bulk")
async def bulk_delete_users(user_ids: List[int]):
    """Bulk deletion with confirmation"""
    pass
```

---

## 3. API Versioning Strategies

### URL Versioning

The most explicit and widely adopted versioning strategy:

```python
from fastapi import FastAPI, APIRouter
from typing import Optional

# Version-specific routers
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])
v2_router = APIRouter(prefix="/api/v2", tags=["v2"])

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: int):
    """Version 1: Returns basic user info"""
    return {"id": user_id, "name": "John", "email": "john@example.com"}

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: int):
    """Version 2: Returns enhanced user info with new fields"""
    return {
        "id": user_id,
        "profile": {
            "name": "John",
            "email": "john@example.com",
            "preferences": {"theme": "dark", "notifications": True}
        },
        "metadata": {"last_login": "2024-01-15T10:30:00Z"}
    }

app = FastAPI()
app.include_router(v1_router)
app.include_router(v2_router)
```

### Header Versioning

Use custom headers or Accept headers for versioning:

```python
from fastapi import FastAPI, Header, HTTPException
from typing import Optional

@app.get("/users/{user_id}")
async def get_user_versioned(
    user_id: int,
    api_version: Optional[str] = Header(None, alias="API-Version"),
    accept: Optional[str] = Header(None)
):
    """
    Version handling through headers
    Supports both API-Version header and Accept header
    """
    version = "1.0"  # default
    
    if api_version:
        version = api_version
    elif accept and "application/vnd.api+json" in accept:
        # Parse version from Accept header
        # application/vnd.api+json;version=2.0
        pass
    
    if version == "1.0":
        return {"id": user_id, "name": "John"}
    elif version == "2.0":
        return {"id": user_id, "profile": {"name": "John"}}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported API version: {version}"
        )
```

### Content Negotiation Versioning

Use media types to specify API version:

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

@app.get("/users/{user_id}")
async def get_user_content_negotiation(user_id: int, request: Request):
    """Version through Accept header media type"""
    accept_header = request.headers.get("accept", "")
    
    if "application/vnd.myapi.v1+json" in accept_header:
        return JSONResponse(
            content={"id": user_id, "name": "John"},
            media_type="application/vnd.myapi.v1+json"
        )
    elif "application/vnd.myapi.v2+json" in accept_header:
        return JSONResponse(
            content={"id": user_id, "profile": {"name": "John"}},
            media_type="application/vnd.myapi.v2+json"
        )
    else:
        # Default to latest version
        return {"id": user_id, "profile": {"name": "John"}}
```

### Deprecation Strategy

Implement graceful deprecation with clear timelines:

```python
from fastapi import FastAPI, Header, Depends
from fastapi.responses import JSONResponse
import warnings
from datetime import datetime, timedelta

def deprecation_warning(
    api_version: Optional[str] = Header(None, alias="API-Version")
):
    """Dependency to handle deprecation warnings"""
    if api_version == "1.0":
        deprecation_date = datetime(2024, 6, 1)
        sunset_date = datetime(2024, 12, 1)
        
        return {
            "Deprecation": f"version=1.0, date={deprecation_date.isoformat()}",
            "Sunset": sunset_date.isoformat(),
            "Link": '</api/v2/users>; rel="successor-version"'
        }
    return {}

@app.get("/users")
async def get_users(deprecation_headers: dict = Depends(deprecation_warning)):
    """Endpoint with deprecation handling"""
    response = JSONResponse(content={"users": []})
    
    # Add deprecation headers
    for header, value in deprecation_headers.items():
        response.headers[header] = value
    
    return response
```

---

## 4. Request Format Standards

### Content-Type Handling

Handle different content types appropriately:

```python
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import json

class UserProfile(BaseModel):
    name: str
    bio: Optional[str] = None
    tags: List[str] = []

@app.post("/users/profile")
async def create_profile_json(profile: UserProfile):
    """Handle JSON content (Content-Type: application/json)"""
    return {"message": "Profile created", "profile": profile}

@app.post("/users/profile-form")
async def create_profile_form(
    name: str = Form(...),
    bio: Optional[str] = Form(None),
    tags: str = Form("[]")  # JSON string for complex types
):
    """Handle form data (Content-Type: application/x-www-form-urlencoded)"""
    try:
        parsed_tags = json.loads(tags)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid tags format")
    
    return {"message": "Profile created", "name": name, "bio": bio, "tags": parsed_tags}

@app.post("/users/profile-multipart")
async def create_profile_multipart(
    name: str = Form(...),
    bio: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    documents: List[UploadFile] = File(default=[])
):
    """Handle multipart data (Content-Type: multipart/form-data)"""
    result = {"name": name, "bio": bio}
    
    if avatar:
        # Validate file type and size
        if not avatar.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Avatar must be an image")
        
        if avatar.size > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="Avatar too large")
        
        result["avatar"] = {"filename": avatar.filename, "size": avatar.size}
    
    result["documents"] = [
        {"filename": doc.filename, "size": doc.size} 
        for doc in documents
    ]
    
    return result
```

### Request Body Structure

Design consistent payload structures:

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class CreateOrderRequest(BaseModel):
    """Consistent request structure with validation"""
    
    # Required fields
    customer_id: int = Field(..., gt=0, description="Customer identifier")
    items: List[Dict[str, Any]] = Field(..., min_items=1, description="Order items")
    
    # Optional fields with defaults
    priority: Priority = Field(Priority.medium, description="Order priority")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    metadata: Optional[Dict[str, str]] = Field(default_factory=dict)
    
    # Nested objects
    shipping_address: Dict[str, str] = Field(..., description="Shipping information")
    billing_address: Optional[Dict[str, str]] = Field(None, description="Billing information")
    
    @validator('items')
    def validate_items(cls, v):
        """Custom validation for items structure"""
        for item in v:
            required_fields = ['product_id', 'quantity', 'price']
            if not all(field in item for field in required_fields):
                raise ValueError(f"Each item must have: {required_fields}")
            
            if item['quantity'] <= 0:
                raise ValueError("Quantity must be positive")
                
        return v
    
    @validator('shipping_address')
    def validate_address(cls, v):
        """Validate address structure"""
        required_fields = ['street', 'city', 'postal_code', 'country']
        if not all(field in v for field in required_fields):
            raise ValueError(f"Address must have: {required_fields}")
        return v

@app.post("/orders")
async def create_order(order: CreateOrderRequest):
    """Create order with validated request structure"""
    return {"message": "Order created", "order_id": 12345}
```

### File Upload Best Practices

Handle file uploads securely and efficiently:

```python
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import magic
import uuid
import os
from pathlib import Path

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def validate_file(file: UploadFile) -> dict:
    """Comprehensive file validation"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {ALLOWED_EXTENSIONS}"
        )
    
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Max size: {MAX_FILE_SIZE} bytes"
        )
    
    # Validate MIME type (requires python-magic)
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    
    detected_type = magic.from_buffer(content, mime=True)
    expected_types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif',
        '.pdf': 'application/pdf'
    }
    
    if file_ext in expected_types and detected_type != expected_types[file_ext]:
        raise HTTPException(
            status_code=400,
            detail="File content doesn't match extension"
        )
    
    return {
        "filename": file.filename,
        "size": file.size,
        "mime_type": detected_type,
        "extension": file_ext
    }

@app.post("/documents/upload")
async def upload_document(
    category: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    tags: str = Form("[]")  # JSON array as string
):
    """Secure file upload with validation"""
    
    # Validate file
    file_info = await validate_file(file)
    
    # Generate secure filename
    secure_filename = f"{uuid.uuid4()}{file_info['extension']}"
    
    # Parse tags
    try:
        parsed_tags = json.loads(tags)
    except json.JSONDecodeError:
        parsed_tags = []
    
    # In production, save to cloud storage or secure file system
    # For example: AWS S3, Google Cloud Storage, etc.
    
    return {
        "document_id": str(uuid.uuid4()),
        "original_filename": file_info["filename"],
        "stored_filename": secure_filename,
        "size": file_info["size"],
        "mime_type": file_info["mime_type"],
        "category": category,
        "description": description,
        "tags": parsed_tags,
        "upload_url": f"/documents/{secure_filename}"
    }
```

---

## 5. Response Format Standards

### Consistent Response Structure

Implement envelope patterns for consistent API responses:

```python
from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
import uuid

class APIResponse(BaseModel):
    """Standard API response envelope"""
    success: bool
    data: Optional[Union[Dict, List, str, int]] = None
    error: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {"id": 1, "name": "John"},
                "error": None,
                "metadata": {
                    "timestamp": "2024-01-15T10:30:00Z",
                    "request_id": "req_123",
                    "api_version": "v1",
                    "execution_time_ms": 150
                }
            }
        }

class PaginatedResponse(BaseModel):
    """Response with pagination metadata"""
    success: bool = True
    data: List[Dict[str, Any]]
    pagination: Dict[str, Any]
    metadata: Dict[str, Any] = {}

def create_response(
    data: Any = None,
    error: Dict = None,
    request: Request = None,
    execution_time: Optional[float] = None
) -> APIResponse:
    """Helper function to create consistent responses"""
    
    metadata = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "api_version": "v1"
    }
    
    if request:
        # Generate request ID if not present
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        metadata["request_id"] = request_id
        
    if execution_time:
        metadata["execution_time_ms"] = round(execution_time * 1000, 2)
    
    return APIResponse(
        success=error is None,
        data=data,
        error=error,
        metadata=metadata
    )

@app.get("/users/{user_id}", response_model=APIResponse)
async def get_user_with_envelope(user_id: int, request: Request):
    """Example with response envelope"""
    
    # Simulate processing time
    import time
    start_time = time.time()
    
    try:
        # Simulate database lookup
        if user_id == 999:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = {
            "id": user_id,
            "username": f"user_{user_id}",
            "email": f"user_{user_id}@example.com",
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        execution_time = time.time() - start_time
        return create_response(
            data=user_data,
            request=request,
            execution_time=execution_time
        )
        
    except HTTPException as e:
        execution_time = time.time() - start_time
        error_data = {
            "code": "USER_NOT_FOUND",
            "message": e.detail,
            "status_code": e.status_code
        }
        return create_response(
            error=error_data,
            request=request,
            execution_time=execution_time
        )

@app.get("/users", response_model=PaginatedResponse)
async def get_users_paginated(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    request: Request = None
):
    """Paginated response example"""
    
    # Simulate data fetching
    total_users = 150
    start_index = (page - 1) * limit
    end_index = min(start_index + limit, total_users)
    
    users = [
        {"id": i, "username": f"user_{i}", "email": f"user_{i}@example.com"}
        for i in range(start_index + 1, end_index + 1)
    ]
    
    return PaginatedResponse(
        data=users,
        pagination={
            "page": page,
            "limit": limit,
            "total": total_users,
            "pages": (total_users + limit - 1) // limit,
            "has_next": end_index < total_users,
            "has_prev": page > 1,
            "next_page": page + 1 if end_index < total_users else None,
            "prev_page": page - 1 if page > 1 else None
        },
        metadata={
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "request_id": request.headers.get("X-Request-ID", str(uuid.uuid4())) if request else None
        }
    )
```

### HATEOAS Implementation

Include hypermedia controls for discoverability:

```python
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Dict, Optional

class Link(BaseModel):
    href: str
    rel: str
    method: str = "GET"
    type: str = "application/json"

class HATEOASResource(BaseModel):
    """Base model with HATEOAS links"""
    _links: Dict[str, Link] = {}

class UserResource(HATEOASResource):
    id: int
    username: str
    email: str
    status: str

def generate_user_links(user_id: int, base_url: str) -> Dict[str, Link]:
    """Generate HATEOAS links for user resource"""
    return {
        "self": Link(
            href=f"{base_url}/api/v1/users/{user_id}",
            rel="self"
        ),
        "edit": Link(
            href=f"{base_url}/api/v1/users/{user_id}",
            rel="edit",
            method="PUT"
        ),
        "delete": Link(
            href=f"{base_url}/api/v1/users/{user_id}",
            rel="delete",
            method="DELETE"
        ),
        "orders": Link(
            href=f"{base_url}/api/v1/users/{user_id}/orders",
            rel="related"
        ),
        "profile": Link(
            href=f"{base_url}/api/v1/users/{user_id}/profile",
            rel="related"
        )
    }

@app.get("/users/{user_id}", response_model=UserResource)
async def get_user_hateoas(user_id: int, request: Request):
    """User endpoint with HATEOAS links"""
    
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    
    user = UserResource(
        id=user_id,
        username=f"user_{user_id}",
        email=f"user_{user_id}@example.com",
        status="active",
        _links=generate_user_links(user_id, base_url)
    )
    
    # Add conditional links based on user status
    if user.status == "active":
        user._links["deactivate"] = Link(
            href=f"{base_url}/api/v1/users/{user_id}/deactivate",
            rel="action",
            method="POST"
        )
    elif user.status == "inactive":
        user._links["activate"] = Link(
            href=f"{base_url}/api/v1/users/{user_id}/activate",
            rel="action",
            method="POST"
        )
    
    return user
```

---

## 6. HTTP Status Codes

### Complete Status Code Reference

Use appropriate HTTP status codes for different scenarios:

```python
from fastapi import FastAPI, HTTPException, status, Request, Depends
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional

# 2xx Success Codes
@app.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user_201(user_data: dict):
    """201: Created - Resource successfully created"""
    return {"id": 123, "message": "User created successfully"}

@app.get("/users/{user_id}")
async def get_user_200(user_id: int):
    """200: OK - Request successful with response body"""
    return {"id": user_id, "name": "John"}

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_204(user_id: int):
    """204: No Content - Successful deletion, no response body"""
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.patch("/users/{user_id}")
async def update_user_202(user_id: int, user_data: dict):
    """202: Accepted - Request accepted for async processing"""
    # Trigger background processing
    return {
        "message": "Update request accepted",
        "task_id": "task_123",
        "status_url": f"/tasks/task_123/status"
    }

# 3xx Redirection Codes
@app.get("/users/{user_id}/redirect")
async def redirect_user_301(user_id: int):
    """301: Moved Permanently - Resource permanently moved"""
    return JSONResponse(
        status_code=status.HTTP_301_MOVED_PERMANENTLY,
        headers={"Location": f"/api/v2/users/{user_id}"},
        content={"message": "Resource moved permanently"}
    )

@app.get("/users/{user_id}/temp-redirect")
async def redirect_user_302(user_id: int):
    """302: Found - Temporary redirect"""
    return JSONResponse(
        status_code=status.HTTP_302_FOUND,
        headers={"Location": f"/users/{user_id}/profile"},
        content={"message": "Temporarily redirected"}
    )

@app.get("/users/{user_id}/cached")
async def get_user_304(user_id: int, request: Request):
    """304: Not Modified - Resource unchanged, use cached version"""
    if_none_match = request.headers.get("If-None-Match")
    current_etag = f'"{user_id}-v1"'
    
    if if_none_match == current_etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED)
    
    return JSONResponse(
        content={"id": user_id, "name": "John"},
        headers={"ETag": current_etag}
    )

# 4xx Client Error Codes
@app.get("/users/bad-request")
async def bad_request_400():
    """400: Bad Request - Invalid request format"""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": "INVALID_REQUEST",
            "message": "Request body contains invalid JSON",
            "details": ["Missing required field: 'email'"]
        }
    )

@app.get("/users/unauthorized")
async def unauthorized_401():
    """401: Unauthorized - Authentication required"""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"}
    )

@app.get("/users/forbidden")
async def forbidden_403():
    """403: Forbidden - Access denied"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "ACCESS_DENIED",
            "message": "Insufficient permissions to access this resource"
        }
    )

@app.get("/users/not-found/{user_id}")
async def not_found_404(user_id: int):
    """404: Not Found - Resource doesn't exist"""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error": "RESOURCE_NOT_FOUND",
            "message": f"User with ID {user_id} not found",
            "resource_type": "user",
            "resource_id": str(user_id)
        }
    )

@app.put("/users/{user_id}/conflict")
async def conflict_409(user_id: int):
    """409: Conflict - Request conflicts with current state"""
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "error": "RESOURCE_CONFLICT",
            "message": "Email address already exists",
            "conflicting_field": "email"
        }
    )

@app.post("/users/unprocessable")
async def unprocessable_422():
    """422: Unprocessable Entity - Validation errors"""
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "validation_errors": [
                {
                    "field": "email",
                    "message": "Invalid email format",
                    "code": "INVALID_EMAIL"
                },
                {
                    "field": "age",
                    "message": "Must be between 18 and 120",
                    "code": "OUT_OF_RANGE"
                }
            ]
        }
    )

@app.get("/users/rate-limited")
async def rate_limited_429():
    """429: Too Many Requests - Rate limit exceeded"""
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests",
            "retry_after": 60
        },
        headers={"Retry-After": "60"}
    )

# 5xx Server Error Codes
@app.get("/users/server-error")
async def server_error_500():
    """500: Internal Server Error - Unexpected server error"""
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "error_id": "err_123456"
        }
    )

@app.get("/users/bad-gateway")
async def bad_gateway_502():
    """502: Bad Gateway - Upstream service error"""
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "error": "UPSTREAM_SERVICE_ERROR",
            "message": "Database service unavailable",
            "service": "user_database"
        }
    )

@app.get("/users/service-unavailable")
async def service_unavailable_503():
    """503: Service Unavailable - Temporary service unavailability"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "error": "SERVICE_UNAVAILABLE",
            "message": "Service temporarily unavailable due to maintenance",
            "estimated_recovery": "2024-01-15T14:00:00Z"
        },
        headers={"Retry-After": "3600"}
    )
```

### Status Code Decision Matrix

| Scenario | Status Code | Use Case |
|----------|-------------|----------|
| Resource created successfully | 201 | POST operations creating new resources |
| Request successful with data | 200 | GET, PUT, PATCH operations |
| Request successful, no content | 204 | DELETE operations, some PUT operations |
| Async processing accepted | 202 | Long-running operations |
| Invalid request syntax | 400 | Malformed JSON, missing required headers |
| Authentication required | 401 | Missing or invalid authentication |
| Access forbidden | 403 | Valid auth but insufficient permissions |
| Resource not found | 404 | GET, PUT, DELETE on non-existent resource |
| Method not allowed | 405 | Using POST on read-only endpoint |
| Request conflicts with state | 409 | Duplicate creation, version conflicts |
| Validation failed | 422 | Valid syntax but business rule violations |
| Rate limit exceeded | 429 | Too many requests from client |
| Server error | 500 | Unexpected application errors |
| Upstream service error | 502 | Database or external service failures |
| Service unavailable | 503 | Maintenance mode, overloaded |

---

## 7. Error Handling & Exception Design

### Standardized Error Response Structure

Create consistent error responses across your API:

```python
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Any, Dict
import logging
import traceback
import uuid
from datetime import datetime

class ErrorDetail(BaseModel):
    """Individual error detail"""
    code: str
    message: str
    field: Optional[str] = None
    value: Optional[Any] = None

class APIError(BaseModel):
    """Standardized error response"""
    error: bool = True
    error_code: str
    message: str
    details: List[ErrorDetail] = []
    timestamp: str
    request_id: str
    path: str
    method: str

class CustomHTTPException(HTTPException):
    """Enhanced HTTP exception with additional context"""
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: List[ErrorDetail] = None,
        headers: dict = None
    ):
        self.error_code = error_code
        self.details = details or []
        super().__init__(status_code=status_code, detail=message, headers=headers)

# Global exception handlers
@app.exception_handler(CustomHTTPException)
async def custom_http_exception_handler(request: Request, exc: CustomHTTPException):
    """Handle custom HTTP exceptions"""
    
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    
    error_response = APIError(
        error_code=exc.error_code,
        message=exc.detail,
        details=exc.details,
        timestamp=datetime.utcnow().isoformat() + "Z",
        request_id=request_id,
        path=str(request.url.path),
        method=request.method
    )
    
    # Log error for monitoring
    logging.error(f"API Error: {exc.error_code} - {exc.detail}", extra={
        "request_id": request_id,
        "path": request.url.path,
        "method": request.method,
        "status_code": exc.status_code
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict(),
        headers=exc.headers
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    
    details = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"])
        details.append(ErrorDetail(
            code="VALIDATION_ERROR",
            message=error["msg"],
            field=field_path,
            value=error.get("input")
        ))
    
    error_response = APIError(
        error_code="VALIDATION_FAILED",
        message="Request validation failed",
        details=details,
        timestamp=datetime.utcnow().isoformat() + "Z",
        request_id=request_id,
        path=str(request.url.path),
        method=request.method
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.dict()
    )

@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    """Handle unexpected server errors"""
    
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    error_id = str(uuid.uuid4())
    
    # Log full traceback for debugging
    logging.error(f"Internal Server Error: {error_id}", extra={
        "request_id": request_id,
        "error_id": error_id,
        "traceback": traceback.format_exc(),
        "path": request.url.path,
        "method": request.method
    })
    
    error_response = APIError(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        details=[ErrorDetail(
            code="SYSTEM_ERROR",
            message=f"Error ID: {error_id} - Please contact support"
        )],
        timestamp=datetime.utcnow().isoformat() + "Z",
        request_id=request_id,
        path=str(request.url.path),
        method=request.method
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.dict()
    )

# Business logic error examples
class UserNotFoundError(CustomHTTPException):
    def __init__(self, user_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="USER_NOT_FOUND",
            message=f"User with ID {user_id} not found",
            details=[ErrorDetail(
                code="RESOURCE_NOT_FOUND",
                message="The requested user does not exist",
                field="user_id",
                value=user_id
            )]
        )

class DuplicateEmailError(CustomHTTPException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="DUPLICATE_EMAIL",
            message="Email address already exists",
            details=[ErrorDetail(
                code="UNIQUE_CONSTRAINT_VIOLATION",
                message="This email address is already registered",
                field="email",
                value=email
            )]
        )

class InsufficientPermissionsError(CustomHTTPException):
    def __init__(self, required_permission: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="INSUFFICIENT_PERMISSIONS",
            message="Access denied",
            details=[ErrorDetail(
                code="PERMISSION_REQUIRED",
                message=f"Required permission: {required_permission}",
                field="permission",
                value=required_permission
            )]
        )

# Usage examples
@app.get("/users/{user_id}")
async def get_user_with_errors(user_id: int):
    """Example endpoint demonstrating error handling"""
    
    if user_id == 999:
        raise UserNotFoundError(user_id)
    
    if user_id < 0:
        raise CustomHTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_USER_ID",
            message="User ID must be positive",
            details=[ErrorDetail(
                code="INVALID_VALUE",
                message="User ID cannot be negative",
                field="user_id",
                value=user_id
            )]
        )
    
    return {"id": user_id, "name": f"User {user_id}"}

@app.post("/users")
async def create_user_with_errors(user_data: dict):
    """Example demonstrating business logic errors"""
    
    email = user_data.get("email")
    if email == "duplicate@example.com":
        raise DuplicateEmailError(email)
    
    return {"id": 123, "email": email, "message": "User created"}
```

### Error Classification and Handling Strategy

Implement different handling strategies for different error types:

```python
from enum import Enum
from typing import Type
import asyncio

class ErrorCategory(Enum):
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    EXTERNAL_SERVICE = "external_service"

class BaseAPIError(Exception):
    """Base class for all API errors"""
    category: ErrorCategory
    error_code: str
    message: str
    retryable: bool = False
    
    def __init__(self, message: str, details: List[ErrorDetail] = None):
        self.message = message
        self.details = details or []
        super().__init__(message)

class ValidationError(BaseAPIError):
    category = ErrorCategory.VALIDATION
    error_code = "VALIDATION_ERROR"
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

class AuthenticationError(BaseAPIError):
    category = ErrorCategory.AUTHENTICATION
    error_code = "AUTHENTICATION_ERROR"
    status_code = status.HTTP_401_UNAUTHORIZED

class AuthorizationError(BaseAPIError):
    category = ErrorCategory.AUTHORIZATION
    error_code = "AUTHORIZATION_ERROR"
    status_code = status.HTTP_403_FORBIDDEN

class BusinessLogicError(BaseAPIError):
    category = ErrorCategory.BUSINESS_LOGIC
    status_code = status.HTTP_409_CONFLICT

class SystemError(BaseAPIError):
    category = ErrorCategory.SYSTEM
    error_code = "SYSTEM_ERROR"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    retryable = True

class ExternalServiceError(BaseAPIError):
    category = ErrorCategory.EXTERNAL_SERVICE
    error_code = "EXTERNAL_SERVICE_ERROR"
    status_code = status.HTTP_502_BAD_GATEWAY
    retryable = True

# Error handling with retry logic
async def handle_external_service_call(service_name: str, operation: callable, max_retries: int = 3):
    """Handle external service calls with retry logic"""
    
    for attempt in range(max_retries):
        try:
            return await operation()
        except Exception as e:
            if attempt == max_retries - 1:
                raise ExternalServiceError(
                    f"Failed to communicate with {service_name} after {max_retries} attempts",
                    details=[ErrorDetail(
                        code="SERVICE_UNAVAILABLE",
                        message=f"Service {service_name} is currently unavailable",
                        value=str(e)
                    )]
                )
            
            # Exponential backoff
            await asyncio.sleep(2 ** attempt)

# Circuit breaker pattern for external services
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, operation: callable):
        if self.state == "OPEN":
            if datetime.utcnow().timestamp() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise ExternalServiceError("Circuit breaker is OPEN")
        
        try:
            result = await operation()
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow().timestamp()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            
            raise e