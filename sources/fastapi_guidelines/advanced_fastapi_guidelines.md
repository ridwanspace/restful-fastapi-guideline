## 8. Filtering, Searching & Querying

### Query Parameter Design

Implement comprehensive filtering capabilities:

```python
from fastapi import FastAPI, Query, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
import re

class FilterOperator(str, Enum):
    eq = "eq"          # Equal
    ne = "ne"          # Not equal
    gt = "gt"          # Greater than
    gte = "gte"        # Greater than or equal
    lt = "lt"          # Less than
    lte = "lte"        # Less than or equal
    in_ = "in"         # In list
    nin = "nin"        # Not in list
    like = "like"      # Pattern matching
    ilike = "ilike"    # Case-insensitive pattern matching
    regex = "regex"    # Regular expression
    between = "between" # Range query

class SortDirection(str, Enum):
    asc = "asc"
    desc = "desc"

class FilterParams(BaseModel):
    """Base filter parameters"""
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: SortDirection = Field(SortDirection.asc, description="Sort direction")

def parse_filter_value(value: str, operator: FilterOperator) -> Any:
    """Parse filter value based on operator"""
    if operator in [FilterOperator.in_, FilterOperator.nin]:
        return [item.strip() for item in value.split(",")]
    elif operator == FilterOperator.between:
        parts = value.split(",")
        if len(parts) != 2:
            raise ValueError("Between operator requires exactly 2 values")
        return [parts[0].strip(), parts[1].strip()]
    elif value.lower() in ["true", "false"]:
        return value.lower() == "true"
    elif value.isdigit():
        return int(value)
    else:
        try:
            return float(value)
        except ValueError:
            return value

def build_filter_query(filters: Dict[str, str]) -> Dict[str, Any]:
    """Build filter query from request parameters"""
    query_filters = {}
    
    for key, value in filters.items():
        if "__" in key:
            field, operator = key.split("__", 1)
            if operator not in [op.value for op in FilterOperator]:
                continue
            
            try:
                parsed_value = parse_filter_value(value, FilterOperator(operator))
                if field not in query_filters:
                    query_filters[field] = {}
                query_filters[field][operator] = parsed_value
            except ValueError:
                continue
        else:
            # Default to equality
            query_filters[key] = {"eq": value}
    
    return query_filters

class UserFilters(FilterParams):
    """User-specific filters"""
    username: Optional[str] = Field(None, description="Filter by username")
    email: Optional[str] = Field(None, description="Filter by email")
    status: Optional[str] = Field(None, regex="^(active|inactive|suspended)$")
    created_after: Optional[date] = Field(None, description="Filter users created after date")
    created_before: Optional[date] = Field(None, description="Filter users created before date")
    role: Optional[List[str]] = Field(None, description="Filter by roles")

@app.get("/users/advanced-filter")
async def get_users_advanced_filter(
    # Basic filters
    filters: UserFilters = Depends(),
    
    # Advanced filter parameters using query strings
    username__like: Optional[str] = Query(None, description="Username contains pattern"),
    email__ilike: Optional[str] = Query(None, description="Email contains pattern (case-insensitive)"),
    age__gte: Optional[int] = Query(None, ge=0, description="Age greater than or equal"),
    age__lte: Optional[int] = Query(None, le=150, description="Age less than or equal"),
    created_at__between: Optional[str] = Query(None, description="Date range: YYYY-MM-DD,YYYY-MM-DD"),
    role__in: Optional[str] = Query(None, description="Comma-separated list of roles"),
    status__ne: Optional[str] = Query(None, description="Status not equal to"),
    
    # Full-text search
    search: Optional[str] = Query(None, min_length=3, description="Full-text search"),
    
    # Field selection (sparse fieldsets)
    fields: Optional[str] = Query(None, description="Comma-separated list of fields to return")
):
    """
    Advanced filtering with multiple operators and search
    
    Example queries:
    - /users/advanced-filter?username__like=john&age__gte=25&status__ne=inactive
    - /users/advanced-filter?created_at__between=2024-01-01,2024-12-31&role__in=admin,user
    - /users/advanced-filter?search=developer&fields=id,username,email
    """
    
    # Build filter query from URL parameters
    advanced_filters = {}
    if username__like:
        advanced_filters["username"] = {"like": f"%{username__like}%"}
    if email__ilike:
        advanced_filters["email"] = {"ilike": f"%{email__ilike}%"}
    if age__gte:
        advanced_filters.setdefault("age", {})["gte"] = age__gte
    if age__lte:
        advanced_filters.setdefault("age", {})["lte"] = age__lte
    if created_at__between:
        try:
            start_date, end_date = created_at__between.split(",")
            advanced_filters["created_at"] = {"between": [start_date.strip(), end_date.strip()]}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date range format")
    if role__in:
        roles = [role.strip() for role in role__in.split(",")]
        advanced_filters["role"] = {"in": roles}
    if status__ne:
        advanced_filters["status"] = {"ne": status__ne}
    
    # Field selection
    selected_fields = None
    if fields:
        selected_fields = [field.strip() for field in fields.split(",")]
        # Validate field names
        allowed_fields = {"id", "username", "email", "full_name", "status", "role", "created_at", "age"}
        invalid_fields = set(selected_fields) - allowed_fields
        if invalid_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid fields: {', '.join(invalid_fields)}"
            )
    
    # Simulate database query with filters
    users = [
        {"id": 1, "username": "john_doe", "email": "john@example.com", "status": "active", "role": "admin", "age": 30},
        {"id": 2, "username": "jane_smith", "email": "jane@example.com", "status": "active", "role": "user", "age": 25},
        {"id": 3, "username": "bob_wilson", "email": "bob@example.com", "status": "inactive", "role": "user", "age": 35}
    ]
    
    # Apply field selection
    if selected_fields:
        users = [
            {field: user[field] for field in selected_fields if field in user}
            for user in users
        ]
    
    return {
        "data": users,
        "filters_applied": advanced_filters,
        "search_query": search,
        "selected_fields": selected_fields,
        "pagination": {
            "page": filters.page,
            "limit": filters.limit,
            "total": len(users)
        }
    }

# Complex nested filtering
@app.get("/orders/complex-filter")
async def get_orders_complex_filter(
    # Nested object filtering
    customer__name__ilike: Optional[str] = Query(None),
    customer__email__like: Optional[str] = Query(None),
    customer__age__gte: Optional[int] = Query(None),
    
    # Array filtering
    items__product_id__in: Optional[str] = Query(None),
    items__category__eq: Optional[str] = Query(None),
    
    # Date range filtering
    created_at__gte: Optional[datetime] = Query(None),
    created_at__lte: Optional[datetime] = Query(None),
    
    # Numeric range filtering
    total_amount__between: Optional[str] = Query(None, regex=r"^\d+(\.\d{2})?,\d+(\.\d{2})?$"),
    
    # Logical operators (AND/OR)
    logic: Optional[str] = Query("AND", regex="^(AND|OR)$")
):
    """
    Complex filtering with nested objects and arrays
    
    Examples:
    - /orders/complex-filter?customer__name__ilike=john&items__category__eq=electronics
    - /orders/complex-filter?total_amount__between=100.00,500.00&logic=AND
    """
    
    filters = {}
    
    # Process nested customer filters
    if customer__name__ilike or customer__email__like or customer__age__gte:
        customer_filters = {}
        if customer__name__ilike:
            customer_filters["name"] = {"ilike": f"%{customer__name__ilike}%"}
        if customer__email__like:
            customer_filters["email"] = {"like": f"%{customer__email__like}%"}
        if customer__age__gte:
            customer_filters["age"] = {"gte": customer__age__gte}
        filters["customer"] = customer_filters
    
    # Process array filters
    if items__product_id__in or items__category__eq:
        items_filters = {}
        if items__product_id__in:
            product_ids = [int(pid) for pid in items__product_id__in.split(",")]
            items_filters["product_id"] = {"in": product_ids}
        if items__category__eq:
            items_filters["category"] = {"eq": items__category__eq}
        filters["items"] = {"any": items_filters}  # At least one item matches
    
    # Process date range
    if created_at__gte or created_at__lte:
        date_filter = {}
        if created_at__gte:
            date_filter["gte"] = created_at__gte
        if created_at__lte:
            date_filter["lte"] = created_at__lte
        filters["created_at"] = date_filter
    
    # Process amount range
    if total_amount__between:
        min_amount, max_amount = total_amount__between.split(",")
        filters["total_amount"] = {"between": [float(min_amount), float(max_amount)]}
    
    return {
        "message": "Complex filtering applied",
        "filters": filters,
        "logic_operator": logic,
        "sql_equivalent": "This would generate complex SQL with JOINs and subqueries"
    }
```

### Search Implementation

Implement full-text search capabilities:

```python
from fastapi import FastAPI, Query, Depends
from typing import Optional, List, Dict
import re
from dataclasses import dataclass

@dataclass
class SearchResult:
    id: int
    title: str
    content: str
    score: float
    highlights: List[str]

class SearchParams(BaseModel):
    q: str = Field(..., min_length=1, max_length=200, description="Search query")
    fields: Optional[str] = Field(None, description="Fields to search (comma-separated)")
    boost: Optional[Dict[str, float]] = Field(None, description="Field boost weights")
    fuzzy: bool = Field(False, description="Enable fuzzy matching")
    highlight: bool = Field(True, description="Include highlighted snippets")
    min_score: Optional[float] = Field(None, ge=0, le=1, description="Minimum relevance score")

def parse_search_query(query: str) -> Dict[str, Any]:
    """Parse advanced search query syntax"""
    
    # Remove extra whitespace
    query = re.sub(r'\s+', ' ', query.strip())
    
    # Extract quoted phrases
    phrases = re.findall(r'"([^"]*)"', query)
    
    # Extract field-specific searches (field:value)
    field_searches = re.findall(r'(\w+):(\S+)', query)
    
    # Extract boolean operators
    has_and = ' AND ' in query.upper()
    has_or = ' OR ' in query.upper()
    has_not = ' NOT ' in query.upper() or query.startswith('-')
    
    # Extract individual terms (excluding phrases and field searches)
    remaining_query = query
    for phrase in phrases:
        remaining_query = remaining_query.replace(f'"{phrase}"', '')
    for field, value in field_searches:
        remaining_query = remaining_query.replace(f'{field}:{value}', '')
    
    # Clean up boolean operators for term extraction
    remaining_query = re.sub(r'\b(AND|OR|NOT)\b', '', remaining_query, flags=re.IGNORECASE)
    terms = [term.strip() for term in remaining_query.split() if term.strip()]
    
    return {
        "terms": terms,
        "phrases": phrases,
        "field_searches": dict(field_searches),
        "has_and": has_and,
        "has_or": has_or,
        "has_not": has_not
    }

@app.get("/search", response_model=Dict[str, Any])
async def advanced_search(
    search_params: SearchParams = Depends(),
    category: Optional[str] = Query(None, description="Filter by category"),
    date_from: Optional[date] = Query(None, description="Search from date"),
    date_to: Optional[date] = Query(None, description="Search to date"),
    author: Optional[str] = Query(None, description="Filter by author"),
    tags: Optional[str] = Query(None, description="Comma-separated tags")
):
    """
    Advanced search with multiple features:
    - Full-text search with relevance scoring
    - Field-specific searching (title:python, author:john)
    - Phrase searching ("exact phrase")
    - Boolean operators (AND, OR, NOT)
    - Fuzzy matching for typos
    - Result highlighting
    - Filtering by metadata
    
    Example queries:
    - ?q=python programming
    - ?q="machine learning" AND (python OR java)
    - ?q=title:fastapi author:john
    - ?q=api -rest&fuzzy=true
    """
    
    # Parse the search query
    parsed_query = parse_search_query(search_params.q)
    
    # Simulate search with scoring
    mock_results = [
        {
            "id": 1,
            "title": "FastAPI Tutorial: Building REST APIs",
            "content": "Learn how to build fast and efficient REST APIs using FastAPI framework...",
            "author": "John Doe",
            "category": "programming",
            "tags": ["python", "fastapi", "rest", "api"],
            "created_at": "2024-01-15"
        },
        {
            "id": 2,
            "title": "Python Machine Learning Guide",
            "content": "Complete guide to machine learning with Python and scikit-learn...",
            "author": "Jane Smith",
            "category": "data-science",
            "tags": ["python", "machine-learning", "scikit-learn"],
            "created_at": "2024-01-10"
        }
    ]
    
    # Apply filters
    filtered_results = mock_results
    if category:
        filtered_results = [r for r in filtered_results if r["category"] == category]
    if author:
        filtered_results = [r for r in filtered_results if author.lower() in r["author"].lower()]
    if tags:
        search_tags = [tag.strip().lower() for tag in tags.split(",")]
        filtered_results = [
            r for r in filtered_results 
            if any(tag in [t.lower() for t in r["tags"]] for tag in search_tags)
        ]
    
    # Calculate relevance scores (simplified)
    scored_results = []
    for result in filtered_results:
        score = calculate_relevance_score(result, parsed_query, search_params)
        if search_params.min_score is None or score >= search_params.min_score:
            scored_results.append({
                **result,
                "score": score,
                "highlights": generate_highlights(result, parsed_query) if search_params.highlight else []
            })
    
    # Sort by relevance score
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "query": search_params.q,
        "parsed_query": parsed_query,
        "total_results": len(scored_results),
        "results": scored_results,
        "search_metadata": {
            "fuzzy_enabled": search_params.fuzzy,
            "min_score": search_params.min_score,
            "fields_searched": search_params.fields.split(",") if search_params.fields else ["title", "content"],
            "execution_time_ms": 42  # Mock execution time
        }
    }

def calculate_relevance_score(result: Dict, parsed_query: Dict, params: SearchParams) -> float:
    """Calculate relevance score for search result"""
    score = 0.0
    max_score = 0.0
    
    # Default field weights
    field_weights = {
        "title": 2.0,
        "content": 1.0,
        "author": 1.5,
        "tags": 1.2
    }
    
    # Apply custom boost weights if provided
    if params.boost:
        field_weights.update(params.boost)
    
    # Search fields
    search_fields = params.fields.split(",") if params.fields else ["title", "content"]
    
    for field in search_fields:
        if field not in result:
            continue
            
        field_content = str(result[field]).lower()
        field_weight = field_weights.get(field, 1.0)
        max_score += field_weight
        
        # Score for exact phrases
        for phrase in parsed_query["phrases"]:
            if phrase.lower() in field_content:
                score += field_weight * 0.8
        
        # Score for individual terms
        for term in parsed_query["terms"]:
            if term.lower() in field_content:
                score += field_weight * 0.3
                
            # Fuzzy matching (simplified)
            if params.fuzzy and fuzzy_match(term.lower(), field_content):
                score += field_weight * 0.1
        
        # Score for field-specific searches
        if field in parsed_query["field_searches"]:
            search_value = parsed_query["field_searches"][field].lower()
            if search_value in field_content:
                score += field_weight * 0.9
    
    # Normalize score
    return min(score / max_score if max_score > 0 else 0, 1.0)

def fuzzy_match(term: str, content: str, max_distance: int = 2) -> bool:
    """Simple fuzzy matching using edit distance"""
    words = content.split()
    for word in words:
        if abs(len(word) - len(term)) <= max_distance:
            # Simplified edit distance check
            if levenshtein_distance(term, word) <= max_distance:
                return True
    return False

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def generate_highlights(result: Dict, parsed_query: Dict, max_length: int = 150) -> List[str]:
    """Generate highlighted snippets from search results"""
    highlights = []
    content = result.get("content", "")
    
    # Find sentences containing search terms
    sentences = re.split(r'[.!?]+', content)
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Check if sentence contains search terms
        contains_term = False
        highlighted_sentence = sentence
        
        # Highlight phrases first
        for phrase in parsed_query["phrases"]:
            if phrase.lower() in sentence.lower():
                contains_term = True
                pattern = re.compile(re.escape(phrase), re.IGNORECASE)
                highlighted_sentence = pattern.sub(f"<mark>{phrase}</mark>", highlighted_sentence)
        
        # Highlight individual terms
        for term in parsed_query["terms"]:
            if term.lower() in sentence.lower():
                contains_term = True
                pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
                highlighted_sentence = pattern.sub(f"<mark>{term}</mark>", highlighted_sentence)
        
        if contains_term:
            # Truncate if too long
            if len(highlighted_sentence) > max_length:
                highlighted_sentence = highlighted_sentence[:max_length] + "..."
            highlights.append(highlighted_sentence)
    
    return highlights[:3]  # Return top 3 highlights
```
--

## 9. Pagination Strategies

### Offset-based Pagination

Traditional page-based pagination for most use cases:

```python
from fastapi import FastAPI, Query, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from math import ceil

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number (1-based)")
    limit: int = Field(10, ge=1, le=100, description="Items per page")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

class PaginatedResponse(BaseModel):
    data: List[Dict[str, Any]]
    pagination: Dict[str, Any]
    metadata: Dict[str, Any] = {}

def create_pagination_info(
    total_items: int,
    current_page: int,
    limit: int,
    base_url: str
) -> Dict[str, Any]:
    """Create comprehensive pagination metadata"""
    
    total_pages = ceil(total_items / limit) if total_items > 0 else 0
    has_next = current_page < total_pages
    has_prev = current_page > 1
    
    # Generate page links
    links = {}
    if has_prev:
        links["first"] = f"{base_url}?page=1&limit={limit}"
        links["prev"] = f"{base_url}?page={current_page - 1}&limit={limit}"
    
    if has_next:
        links["next"] = f"{base_url}?page={current_page + 1}&limit={limit}"
        links["last"] = f"{base_url}?page={total_pages}&limit={limit}"
    
    links["self"] = f"{base_url}?page={current_page}&limit={limit}"
    
    return {
        "page": current_page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
        "items_on_page": min(limit, max(0, total_items - (current_page - 1) * limit)),
        "links": links
    }

@app.get("/users", response_model=PaginatedResponse)
async def get_users_paginated(
    pagination: PaginationParams = Depends(),
    request: Request
):
    """Offset-based pagination example"""
    
    # Simulate database query
    total_users = 250  # Total count from database
    
    # Apply offset and limit
    start_idx = pagination.offset
    end_idx = start_idx + pagination.limit
    
    # Simulate fetching data
    users = [
        {
            "id": i,
            "username": f"user_{i}",
            "email": f"user_{i}@example.com",
            "created_at": "2024-01-01T00:00:00Z"
        }
        for i in range(start_idx + 1, min(end_idx + 1, total_users + 1))
    ]
    
    base_url = f"{request.url.scheme}://{request.url.netloc}{request.url.path}"
    pagination_info = create_pagination_info(
        total_users, pagination.page, pagination.limit, base_url
    )
    
    return PaginatedResponse(
        data=users,
        pagination=pagination_info,
        metadata={
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "query_time_ms": 45
        }
    )

# Deep pagination performance warning
@app.get("/users/deep-pagination-warning")
async def get_users_with_warning(
    pagination: PaginationParams = Depends(),
    request: Request
):
    """Handle deep pagination with performance warnings"""
    
    # Warn about performance issues with deep pagination
    if pagination.offset > 10000:
        return JSONResponse(
            status_code=400,
            content={
                "error": "DEEP_PAGINATION_WARNING",
                "message": "Offset-based pagination beyond 10,000 items may be slow",
                "suggestion": "Use cursor-based pagination for better performance",
                "cursor_endpoint": "/users/cursor-paginated"
            }
        )
    
    # Continue with normal pagination...
    return {"message": "Normal pagination response"}
```

### Cursor-based Pagination

High-performance pagination for large datasets:

```python
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import base64
import json
from datetime import datetime

class CursorPaginationParams(BaseModel):
    limit: int = Field(10, ge=1, le=100, description="Items per page")
    cursor: Optional[str] = Field(None, description="Pagination cursor")
    direction: str = Field("forward", regex="^(forward|backward)$")

def encode_cursor(data: Dict[str, Any]) -> str:
    """Encode cursor data to base64 string"""
    cursor_json = json.dumps(data, default=str)
    return base64.b64encode(cursor_json.encode()).decode()

def decode_cursor(cursor: str) -> Dict[str, Any]:
    """Decode cursor from base64 string"""
    try:
        cursor_json = base64.b64decode(cursor.encode()).decode()
        return json.loads(cursor_json)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid cursor format")

@app.get("/users/cursor-paginated")
async def get_users_cursor_paginated(
    params: CursorPaginationParams = Depends(),
    request: Request
):
    """
    Cursor-based pagination for large datasets
    
    Advantages:
    - Consistent performance regardless of position
    - Real-time data safety (no duplicates/missing items)
    - Efficient for large datasets
    
    Cursor format (base64 encoded JSON):
    {
        "id": 12345,
        "created_at": "2024-01-15T10:30:00Z",
        "direction": "forward"
    }
    """
    
    # Decode cursor if provided
    cursor_data = None
    if params.cursor:
        cursor_data = decode_cursor(params.cursor)
    
    # Simulate database query with cursor
    base_query = "SELECT * FROM users"
    where_clauses = []
    order_clause = "ORDER BY created_at DESC, id DESC"
    
    if cursor_data:
        cursor_timestamp = cursor_data.get("created_at")
        cursor_id = cursor_data.get("id")
        
        if params.direction == "forward":
            # Get items after cursor
            where_clauses.append(
                f"(created_at < '{cursor_timestamp}' OR "
                f"(created_at = '{cursor_timestamp}' AND id < {cursor_id}))"
            )
        else:
            # Get items before cursor (for backward pagination)
            where_clauses.append(
                f"(created_at > '{cursor_timestamp}' OR "
                f"(created_at = '{cursor_timestamp}' AND id > {cursor_id}))"
            )
            order_clause = "ORDER BY created_at ASC, id ASC"
    
    # Simulate fetching data
    users = [
        {
            "id": 1000 - i,
            "username": f"user_{1000 - i}",
            "email": f"user_{1000 - i}@example.com",
            "created_at": f"2024-01-{15 - (i // 30):02d}T10:30:00Z"
        }
        for i in range(params.limit + 1)  # Fetch one extra to check if there's more
    ]
    
    # Check if there are more items
    has_more = len(users) > params.limit
    if has_more:
        users = users[:-1]  # Remove the extra item
    
    # Generate cursors for navigation
    cursors = {}
    if users:
        # Next cursor (for forward pagination)
        if has_more:
            last_item = users[-1]
            cursors["next"] = encode_cursor({
                "id": last_item["id"],
                "created_at": last_item["created_at"],
                "direction": "forward"
            })
        
        # Previous cursor (for backward pagination)
        if cursor_data:  # Only if we're not on the first page
            first_item = users[0]
            cursors["prev"] = encode_cursor({
                "id": first_item["id"],
                "created_at": first_item["created_at"],
                "direction": "backward"
            })
    
    return {
        "data": users,
        "pagination": {
            "limit": params.limit,
            "has_more": has_more,
            "cursors": cursors,
            "direction": params.direction
        },
        "metadata": {
            "cursor_info": cursor_data,
            "query": f"{base_query} WHERE {' AND '.join(where_clauses) if where_clauses else '1=1'} {order_clause} LIMIT {params.limit + 1}"
        }
    }

# Keyset pagination for ordered datasets
@app.get("/products/keyset-paginated")
async def get_products_keyset_paginated(
    limit: int = Query(10, ge=1, le=100),
    last_price: Optional[float] = Query(None, description="Last item price from previous page"),
    last_id: Optional[int] = Query(None, description="Last item ID from previous page"),
    sort_order: str = Query("desc", regex="^(asc|desc)$")
):
    """
    Keyset pagination using price and ID for ordering
    
    More efficient than offset-based pagination for large, ordered datasets
    Ideal for feeds, timelines, and sorted product listings
    """
    
    # Build WHERE clause for keyset pagination
    where_conditions = []
    if last_price is not None and last_id is not None:
        if sort_order == "desc":
            where_conditions.append(
                f"(price < {last_price} OR (price = {last_price} AND id < {last_id}))"
            )
        else:
            where_conditions.append(
                f"(price > {last_price} OR (price = {last_price} AND id > {last_id}))"
            )
    
    # Simulate products data
    products = [
        {
            "id": 100 + i,
            "name": f"Product {100 + i}",
            "price": round(99.99 - (i * 0.5), 2),
            "category": "electronics"
        }
        for i in range(limit + 1)
    ]
    
    has_more = len(products) > limit
    if has_more:
        products = products[:-1]
    
    # Generate next page parameters
    next_page_params = {}
    if products and has_more:
        last_product = products[-1]
        next_page_params = {
            "last_price": last_product["price"],
            "last_id": last_product["id"],
            "limit": limit,
            "sort_order": sort_order
        }
    
    return {
        "data": products,
        "pagination": {
            "limit": limit,
            "has_more": has_more,
            "next_page_params": next_page_params,
            "sort_order": sort_order
        },
        }
    }
```
---

## 10. Sorting & Ordering

### Sort Parameter Design

Implement flexible sorting with multiple fields and directions:

```python
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
import re

class SortDirection(str, Enum):
    asc = "asc"
    desc = "desc"

class SortField(BaseModel):
    field: str
    direction: SortDirection = SortDirection.asc

class SortParams(BaseModel):
    sort: Optional[str] = Field(
        None,
        description="Sort specification: field1:asc,field2:desc or +field1,-field2"
    )
    
    @validator('sort')
    def validate_sort_format(cls, v):
        if not v:
            return v
        
        # Validate sort format
        # Supports: "field1:asc,field2:desc" or "+field1,-field2"
        if not re.match(r'^[+\-]?\w+([:\-](asc|desc))?([,][+\-]?\w+([:\-](asc|desc))?)*
        , v):
            raise ValueError('Invalid sort format')
        return v
```
```python
def parse_sort_string(sort_string: str, allowed_fields: set) -> List[SortField]:
    """Parse sort string into structured sort fields"""
    if not sort_string:
        return []
    
    sort_fields = []
    
    # Split by comma for multiple sort fields
    for sort_part in sort_string.split(','):
        sort_part = sort_part.strip()
        
        if ':' in sort_part:
            # Format: "field:direction"
            field, direction = sort_part.split(':', 1)
            direction = direction.lower()
        elif sort_part.startswith('+'):
            # Format: "+field" (ascending)
            field = sort_part[1:]
            direction = 'asc'
        elif sort_part.startswith('-'):
            # Format: "-field" (descending)
            field = sort_part[1:]
            direction = 'desc'
        else:
            # Default to ascending
            field = sort_part
            direction = 'asc'
        
        # Validate field name
        if field not in allowed_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sort field: {field}. Allowed fields: {', '.join(sorted(allowed_fields))}"
            )
        
        # Validate direction
        if direction not in ['asc', 'desc']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sort direction: {direction}. Use 'asc' or 'desc'"
            )
        
        sort_fields.append(SortField(field=field, direction=SortDirection(direction)))
    
    return sort_fields

@app.get("/users/sorted")
async def get_users_sorted(
    sort_params: SortParams = Depends(),
    request: Request
):
    """
    Multi-field sorting with various syntax options
    
    Supported formats:
    - ?sort=username:asc,created_at:desc
    - ?sort=+username,-created_at
    - ?sort=email:asc
    - ?sort=-last_login
    
    Default sort: created_at:desc
    """
    
    # Define allowed sort fields
    allowed_fields = {
        'id', 'username', 'email', 'full_name', 'created_at', 
        'last_login', 'status', 'role', 'age'
    }
    
    # Parse sort parameters
    sort_fields = []
    if sort_params.sort:
        sort_fields = parse_sort_string(sort_params.sort, allowed_fields)
    else:
        # Default sort
        sort_fields = [SortField(field='created_at', direction=SortDirection.desc)]
    
    # Simulate database sorting
    users = [
        {
            "id": i,
            "username": f"user_{i:03d}",
            "email": f"user{i}@example.com",
            "full_name": f"User {i}",
            "created_at": f"2024-01-{(i % 28) + 1:02d}T10:30:00Z",
            "last_login": f"2024-02-{(i % 28) + 1:02d}T15:45:00Z",
            "status": ["active", "inactive"][i % 2],
            "role": ["user", "admin", "moderator"][i % 3],
            "age": 20 + (i % 50)
        }
        for i in range(1, 21)
    ]
    
    # Apply sorting
    for sort_field in reversed(sort_fields):  # Apply in reverse order for stable sort
        reverse = sort_field.direction == SortDirection.desc
        
        if sort_field.field in ['created_at', 'last_login']:
            # Date sorting
            users.sort(key=lambda x: x[sort_field.field], reverse=reverse)
        elif sort_field.field in ['id', 'age']:
            # Numeric sorting
            users.sort(key=lambda x: int(x[sort_field.field]), reverse=reverse)
        else:
            # String sorting
            users.sort(key=lambda x: str(x[sort_field.field]).lower(), reverse=reverse)
    
    # Generate SQL equivalent for documentation
    sql_order_by = ", ".join([
        f"{sf.field} {'DESC' if sf.direction == SortDirection.desc else 'ASC'}"
        for sf in sort_fields
    ])
    
    return {
        "data": users,
        "sort_applied": [
            {"field": sf.field, "direction": sf.direction.value}
            for sf in sort_fields
        ],
        "metadata": {
            "allowed_sort_fields": sorted(allowed_fields),
            "sql_equivalent": f"ORDER BY {sql_order_by}",
            "sort_examples": [
                "?sort=username:asc,created_at:desc",
                "?sort=+username,-created_at",
                "?sort=-last_login",
                "?sort=role:asc,age:desc,username:asc"
        }
    }
```

---

## 11. FastAPI Implementation Examples

### Authentication and Authorization

Comprehensive security implementation with multiple authentication methods:

```python
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader, OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import secrets

# Security configurations
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security schemes
bearer_scheme = HTTPBearer()
api_key_scheme = APIKeyHeader(name="X-API-Key")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Models
class User(BaseModel):
    id: int
    username: str
    email: str
    roles: List[str]
    is_active: bool

class TokenData(BaseModel):
    user_id: int
    username: str
    roles: List[str]
    exp: datetime

class APIKey(BaseModel):
    key_id: str
    name: str
    user_id: int
    permissions: List[str]
    created_at: datetime
    last_used: Optional[datetime] = None

# Mock databases
fake_users_db = {
    "admin": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("adminpass"),
        "roles": ["admin", "user"],
        "is_active": True
    },
    "user": {
        "id": 2,
        "username": "user",
        "email": "user@example.com",
        "hashed_password": pwd_context.hash("userpass"),
        "roles": ["user"],
        "is_active": True
    }
}

fake_api_keys_db = {
    "ak_test123": {
        "key_id": "ak_test123",
        "name": "Test API Key",
        "user_id": 1,
        "permissions": ["read", "write"],
        "created_at": datetime.utcnow(),
        "last_used": None
    }
}

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        username: str = payload.get("sub")
        roles: List[str] = payload.get("roles", [])
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(user_id=user_id, username=username, roles=roles, exp=exp)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Authentication dependencies
async def get_current_user_jwt(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> User:
    """Authenticate user via JWT token"""
    token_data = decode_token(credentials.credentials)
    
    user = fake_users_db.get(token_data.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return User(**user)

async def get_current_user_api_key(api_key: str = Security(api_key_scheme)) -> User:
    """Authenticate user via API key"""
    key_data = fake_api_keys_db.get(api_key)
    if not key_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Update last used timestamp
    key_data["last_used"] = datetime.utcnow()
    
    # Get user associated with API key
    user = None
    for username, user_data in fake_users_db.items():
        if user_data["id"] == key_data["user_id"]:
            user = user_data
            break
    
    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key or inactive user"
        )
    
    return User(**user)

# Flexible authentication that accepts both JWT and API key
async def get_current_user_flexible(
    jwt_credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme, auto_error=False),
    api_key: Optional[str] = Security(api_key_scheme, auto_error=False)
) -> User:
    """Accept either JWT token or API key authentication"""
    
    if jwt_credentials:
        return await get_current_user_jwt(jwt_credentials)
    elif api_key:
        return await get_current_user_api_key(api_key)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide JWT token or API key",
            headers={"WWW-Authenticate": "Bearer"}
        )

# Authorization dependencies
def require_roles(*required_roles: str):
    """Dependency factory for role-based authorization"""
    def role_checker(current_user: User = Depends(get_current_user_flexible)) -> User:
        if not any(role in current_user.roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}"
            )
        return current_user
    return role_checker

def require_permissions(*required_permissions: str):
    """Dependency factory for permission-based authorization"""
    def permission_checker(
        current_user: User = Depends(get_current_user_flexible),
        api_key: Optional[str] = Security(api_key_scheme, auto_error=False)
    ) -> User:
        # Check permissions for API key authentication
        if api_key:
            key_data = fake_api_keys_db.get(api_key)
            if key_data:
                if not all(perm in key_data["permissions"] for perm in required_permissions):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"API key lacks required permissions: {', '.join(required_permissions)}"
                    )
        
        # For JWT, you might have different permission logic
        # This is a simplified example
        return current_user
    return permission_checker

# Authentication endpoints
@app.post("/auth/token")
async def login_for_access_token(username: str, password: str):
    """Obtain JWT access token"""
    user = fake_users_db.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user["username"],
            "user_id": user["id"],
            "roles": user["roles"]
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "roles": user["roles"]
        }
    }

@app.post("/auth/api-keys")
async def create_api_key(
    name: str,
    permissions: List[str],
    current_user: User = Depends(require_roles("admin"))
):
    """Create new API key (admin only)"""
    key_id = f"ak_{secrets.token_urlsafe(16)}"
    
    new_key = {
        "key_id": key_id,
        "name": name,
        "user_id": current_user.id,
        "permissions": permissions,
        "created_at": datetime.utcnow(),
        "last_used": None
    }
    
    fake_api_keys_db[key_id] = new_key
    
    return {
        "api_key": key_id,
        "name": name,
        "permissions": permissions,
        "created_at": new_key["created_at"],
        "warning": "Store this API key securely. It won't be shown again."
    }

# Protected endpoints examples
@app.get("/users/me")
async def get_current_user_info(current_user: User = Depends(get_current_user_flexible)):
    """Get current user information (any authenticated user)"""
    return current_user

@app.get("/admin/users")
async def get_all_users(current_user: User = Depends(require_roles("admin"))):
    """Get all users (admin only)"""
    return {"users": list(fake_users_db.values())}

@app.post("/data/write")
async def write_data(
    data: dict,
    current_user: User = Depends(require_permissions("write"))
):
    """Write data (requires write permission)"""
    return {"message": "Data written successfully", "data": data}

@app.get("/data/read")
async def read_data(
    current_user: User = Depends(require_permissions("read"))
):
    """Read data (requires read permission)"""
    return {"data": "sensitive information"}

@app.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles("admin"))
):
    """Delete user (admin only)"""
    return {"message": f"User {user_id} deleted by {current_user.username}"}
```

### Custom Exception Handlers and Middleware

Advanced error handling and request/response processing:

```python
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import time
import logging
import uuid
from typing import Callable
import traceback

# Custom middleware for request/response processing
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive request/response logging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request start
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        
        logger.info(f"Request started", extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent"),
            "content_length": request.headers.get("content-length")
        })
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log unhandled exceptions
            logger.error(f"Unhandled exception", extra={
                "request_id": request_id,
                "exception": str(e),
                "traceback": traceback.format_exc()
            })
            raise
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add custom headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        # Log response
        logger.info(f"Request completed", extra={
            "request_id": request_id,
            "status_code": response.status_code,
            "process_time": process_time,
            "response_size": response.headers.get("content-length")
        })
        
        return response

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.client_requests = {}  # In production, use Redis
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # Clean old entries (older than 1 minute)
        cutoff_time = current_time - 60
        self.client_requests = {
            ip: [req_time for req_time in times if req_time > cutoff_time]
            for ip, times in self.client_requests.items()
        }
        
        # Check rate limit
        client_requests = self.client_requests.get(client_ip, [])
        if len(client_requests) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # Record this request
        client_requests.append(current_time)
        self.client_requests[client_ip] = client_requests
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = max(0, self.requests_per_minute - len(client_requests))
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response

class CORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware with advanced options"""
    
    def __init__(
        self,
        app,
        allow_origins: List[str] = ["*"],
        allow_methods: List[str] = ["*"],
        allow_headers: List[str] = ["*"],
        expose_headers: List[str] = [],
        allow_credentials: bool = False,
        max_age: int = 86400
    ):
        super().__init__(app)
        self.allow_origins = allow_origins
        self.allow_methods = allow_methods
        self.allow_headers = allow_headers
        self.expose_headers = expose_headers
        self.allow_credentials = allow_credentials
        self.max_age = max_age
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = Response()
            self._add_cors_headers(response, origin)
            return response
        
        # Process normal request
        response = await call_next(request)
        self._add_cors_headers(response, origin)
        return response
    
    def _add_cors_headers(self, response: Response, origin: str):
        """Add CORS headers to response"""
        # Check if origin is allowed
        if self.allow_origins == ["*"] or origin in self.allow_origins:
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
        
        if self.allow_credentials:
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        if self.allow_methods != ["*"]:
            response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allow_methods)
        else:
            response.headers["Access-Control-Allow-Methods"] = "*"
        
        if self.allow_headers != ["*"]:
            response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)
        else:
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        if self.expose_headers:
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
        
        response.headers["Access-Control-Max-Age"] = str(self.max_age)

# Add middleware to app
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitingMiddleware, requests_per_minute=100)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com", "https://app.example.com"],
    allow_credentials=True,
    expose_headers=["X-Request-ID", "X-Process-Time"]
)

# Enhanced exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "error": "VALUE_ERROR",
            "message": str(exc),
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Custom 404 handler with helpful information"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "RESOURCE_NOT_FOUND",
            "message": "The requested resource was not found",
            "path": str(request.url.path),
            "method": request.method,
            "request_id": getattr(request.state, "request_id", None),
            "suggestions": [
                "Check the URL for typos",
                "Verify the resource exists",
                "Check API documentation for correct endpoints"
            ],
            "api_docs": "/docs"
        }
    )

# Dependency injection examples
async def get_database():
    """Database dependency (mock)"""
    # In production, this would return actual database connection
    db = {"connection": "mock_db_connection"}
    try:
        yield db
    finally:
        # Cleanup database connection
        pass

async def get_cache():
    """Cache dependency (mock)"""
    cache = {"connection": "mock_redis_connection"}
    try:
        yield cache
    finally:
        pass

class PaginationDep:
    """Reusable pagination dependency"""
    def __init__(self, default_limit: int = 10, max_limit: int = 100):
        self.default_limit = default_limit
        self.max_limit = max_limit
    
    def __call__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        limit: int = Query(None, ge=1, description="Items per page")
    ):
        if limit is None:
            limit = self.default_limit
        if limit > self.max_limit:
            limit = self.max_limit
        
        return {
            "page": page,
            "limit": limit,
            "offset": (page - 1) * limit
        }

# Usage examples
pagination_dep = PaginationDep(default_limit=20, max_limit=100)

@app.get("/posts")
async def get_posts(
    pagination: dict = Depends(pagination_dep),
    db = Depends(get_database),
    cache = Depends(get_cache)
):
    """Example endpoint using dependency injection"""
    return {
        "message": "Posts retrieved successfully",
        "pagination": pagination,
        "db_info": db,
        "cache_info": cache
    }

# Nested field sorting
@app.get("/orders/sorted-nested")
async def get_orders_sorted_nested(
    sort: Optional[str] = Query(
        None,
        description="Sort by nested fields: customer.name:asc,total:desc,items.count:asc"
    )
):
    """
    Sorting with nested object fields
    
    Supports:
    - customer.name:asc (nested object field)
    - items.count:desc (computed/aggregated field)
    - shipping.address.city:asc (deeply nested field)
    """
    
    allowed_nested_fields = {
        'id', 'created_at', 'status', 'total',
        'customer.id', 'customer.name', 'customer.email',
        'customer.address.city', 'customer.address.country',
        'shipping.method', 'shipping.cost',
        'items.count', 'items.total_weight'
    }
    
    # Parse nested sort fields
    sort_fields = []
    if sort:
        sort_fields = parse_sort_string(sort, allowed_nested_fields)
    else:
        sort_fields = [SortField(field='created_at', direction=SortDirection.desc)]
    
    # Mock orders with nested data
    orders = [
        {
            "id": i,
            "created_at": f"2024-01-{(i % 28) + 1:02d}T10:30:00Z",
            "status": ["pending", "processing", "shipped", "delivered"][i % 4],
            "total": 50.00 + (i * 10.5),
            "customer": {
                "id": 100 + i,
                "name": f"Customer {chr(65 + (i % 26))}",
                "email": f"customer{i}@example.com",
                "address": {
                    "city": ["New York", "Los Angeles", "Chicago", "Houston"][i % 4],
                    "country": "USA"
                }
            },
            "shipping": {
                "method": ["standard", "express", "overnight"][i % 3],
                "cost": 5.00 + (i % 3) * 5.00
            },
            "items": {
                "count": 1 + (i % 5),
                "total_weight": 0.5 + (i % 10) * 0.2
            }
        }
        for i in range(1, 16)
    ]
    
    # Apply nested sorting
    for sort_field in reversed(sort_fields):
        reverse = sort_field.direction == SortDirection.desc
        
        def get_nested_value(obj: dict, field_path: str):
            """Extract value from nested object using dot notation"""
            keys = field_path.split('.')
            value = obj
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            return value
        
        orders.sort(
            key=lambda x: get_nested_value(x, sort_field.field) or "",
            reverse=reverse
        )
    
    return {
        "data": orders,
        "sort_applied": [
            {"field": sf.field, "direction": sf.direction.value}
            for sf in sort_fields
        ],
        "metadata": {
            "allowed_nested_fields": sorted(allowed_nested_fields),
            "nested_sort_examples": [
                "?sort=customer.name:asc",
                "?sort=customer.address.city:asc,total:desc",
                "?sort=items.count:desc,shipping.cost:asc"
            ]
        }
    }

# Custom sort orders
@app.get("/tasks/custom-sort")
async def get_tasks_custom_sort(
    sort: Optional[str] = Query("priority:custom,due_date:asc")
):
    """
    Custom sort orders for business-specific sorting requirements
    
    Example: Priority sorting (high > medium > low) regardless of alphabetical order
    """
    
    # Define custom sort orders
    custom_sort_orders = {
        'priority': ['critical', 'high', 'medium', 'low'],
        'status': ['todo', 'in_progress', 'review', 'done'],
        'urgency': ['urgent', 'normal', 'low']
    }
    
    tasks = [
        {
            "id": i,
            "title": f"Task {i}",
            "priority": ["low", "medium", "high", "critical"][i % 4],
            "status": ["todo", "in_progress", "review", "done"][i % 4],
            "due_date": f"2024-02-{(i % 28) + 1:02d}",
            "urgency": ["low", "normal", "urgent"][i % 3]
        }
        for i in range(1, 13)
    ]
    
    # Parse and apply custom sorting
    allowed_fields = {'id', 'title', 'priority', 'status', 'due_date', 'urgency'}
    sort_fields = parse_sort_string(sort, allowed_fields)
    
    for sort_field in reversed(sort_fields):
        reverse = sort_field.direction == SortDirection.desc
        
        if sort_field.field in custom_sort_orders:
            # Use custom sort order
            custom_order = custom_sort_orders[sort_field.field]
            if reverse:
                custom_order = list(reversed(custom_order))
            
            def custom_sort_key(item):
                value = item[sort_field.field]
                try:
                    return custom_order.index(value)
                except ValueError:
                    return len(custom_order)  # Unknown values go to end
            
            tasks.sort(key=custom_sort_key)
        else:
            # Standard sorting
            tasks.sort(key=lambda x: x[sort_field.field], reverse=reverse)
    
    return {
        "data": tasks,
        "sort_applied": [
            {"field": sf.field, "direction": sf.direction.value}
            for sf in sort_fields
        ],
        "metadata": {
            "custom_sort_orders": custom_sort_orders,
            "custom_sort_explanation": {
                "priority": "critical > high > medium > low",
                "status": "todo > in_progress > review > done",
                "urgency": "urgent > normal > low"
            }
        }
    }
```
--


## 12. Security Considerations

### Input Validation and Sanitization

Comprehensive validation strategies to prevent common attacks:

```python
from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict, Pattern
import re
import html
from urllib.parse import urlparse
import bleach

class SecureUserInput(BaseModel):
    """Secure user input model with comprehensive validation"""
    
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=30,
        regex=r"^[a-zA-Z0-9_-]+$",
        description="Username: alphanumeric, underscore, hyphen only"
    )
    
    email: EmailStr = Field(..., description="Valid email address")
    
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password: minimum 8 characters"
    )
    
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Full name"
    )
    
    website: Optional[str] = Field(
        None,
        max_length=200,
        description="Website URL"
    )
    
    bio: Optional[str] = Field(
        None,
        max_length=500,
        description="User biography"
    )
    
    age: Optional[int] = Field(
        None,
        ge=13,
        le=120,
        description="Age: 13-120"
    )
    
    tags: List[str] = Field(
        default=[],
        max_items=10,
        description="User tags"
    )
    
    metadata: Optional[Dict[str, str]] = Field(
        None,
        description="Additional metadata"
    )
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        # Check for common weak patterns
        weak_patterns = [
            r'123456', r'password', r'qwerty', r'admin',
            r'(.)\1{2,}',  # Repeated characters (aaa, 111)
        ]
        for pattern in weak_patterns:
            if re.search(pattern, v.lower()):
                raise ValueError('Password contains weak patterns')
        
        return v
    
    @validator('full_name')
    def sanitize_full_name(cls, v):
        """Sanitize full name to prevent XSS"""
        if not v:
            return v
        
        # Remove HTML tags and escape special characters
        sanitized = html.escape(v.strip())
        
        # Only allow letters, spaces, apostrophes, and hyphens
        if not re.match(r"^[a-zA-Z\s'\-\.]+$", sanitized):
            raise ValueError('Full name contains invalid characters')
        
        return sanitized
    
    @validator('website')
    def validate_website_url(cls, v):
        """Validate and sanitize website URL"""
        if not v:
            return v
        
        try:
            parsed = urlparse(v)
            
            # Ensure scheme is http or https
            if parsed.scheme not in ['http', 'https']:
                raise ValueError('Website URL must use http or https')
            
            # Basic domain validation
            if not parsed.netloc:
                raise ValueError('Invalid website URL')
            
            # Prevent localhost and private IPs in production
            forbidden_domains = ['localhost', '127.0.0.1', '0.0.0.0']
            if any(domain in parsed.netloc.lower() for domain in forbidden_domains):
                raise ValueError('Local URLs not allowed')
            
            return v
        except Exception:
            raise ValueError('Invalid website URL format')
    
    @validator('bio')
    def sanitize_bio(cls, v):
        """Sanitize bio content"""
        if not v:
            return v
        
        # Allow basic HTML tags but sanitize
        allowed_tags = ['b', 'i', 'em', 'strong', 'a', 'br']
        allowed_attributes = {'a': ['href']}
        
        sanitized = bleach.clean(
            v,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        return sanitized.strip()
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate and sanitize tags"""
        if not v:
            return []
        
        sanitized_tags = []
        for tag in v:
            # Clean and validate each tag
            clean_tag = re.sub(r'[^a-zA-Z0-9_-]', '', tag.strip().lower())
            if len(clean_tag) >= 2 and len(clean_tag) <= 20:
                sanitized_tags.append(clean_tag)
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(sanitized_tags))
    
    @validator('metadata')
    def validate_metadata(cls, v):
        """Validate metadata dictionary"""
        if not v:
            return {}
        
        # Limit number of metadata fields
        if len(v) > 10:
            raise ValueError('Too many metadata fields (max 10)')
        
        validated_metadata = {}
        for key, value in v.items():
            # Validate keys
            if not re.match(r'^[a-zA-Z0-9_-]+$', key) or len(key) > 50:
                raise ValueError(f'Invalid metadata key: {key}. Keys must be alphanumeric, underscore, or hyphen, and max 50 chars.')
            
            # Validate values (e.g., ensure they are strings and within a certain length)
            if not isinstance(value, str) or len(value) > 255:
                raise ValueError(f'Invalid metadata value for key "{key}". Values must be strings and max 255 chars.')
            
            validated_metadata[key] = html.escape(value.strip()) # Sanitize and store
        
        return validated_metadata

# Example of how to use this model (optional, can be removed if not needed in docs)
# app = FastAPI()
#
# @app.post("/register/")
# async def register_user(user_input: SecureUserInput):
#     # At this point, user_input is validated
#     # Proceed with user registration logic
#     return {"message": "User registered successfully", "user_details": user_input.dict()}
#
# @app.get("/test-validation/")
# async def test_validation_endpoint(
#     username: str = Query(..., min_length=3, max_length=30, regex=r"^[a-zA-Z0-9_-]+$"),
#     email: EmailStr = Query(...),
#     age: Optional[int] = Query(None, ge=13, le=120)
# ):
#     # This endpoint demonstrates query parameter validation similar to Pydantic fields
#     return {"message": "Query parameters are valid", "username": username, "email": email, "age": age}

```
--
## 13. Performance & Optimization

### Caching Strategies

Implement comprehensive caching for improved performance:

```python
from fastapi import FastAPI, Depends, Response, Request, HTTPException
from typing import Optional, Dict, Any
import hashlib
import json
import time
from datetime import datetime, timedelta
import redis
from functools import wraps

# Redis connection (mock for example)
class MockRedis:
    def __init__(self):
        self.data = {}
    
    def get(self, key: str) -> Optional[str]:
        item = self.data.get(key)
        if item and item['expires'] > time.time():
            return item['value']
        elif item:
            del self.data[key]
        return None
    
    def set(self, key: str, value: str, ex: int = 3600):
        self.data[key] = {
            'value': value,
            'expires': time.time() + ex
        }
    
    def delete(self, key: str):
        self.data.pop(key, None)

redis_client = MockRedis()

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate consistent cache key from parameters"""
    key_data = f"{prefix}:{':'.join(map(str, args))}"
    if kwargs:
        sorted_kwargs = sorted(kwargs.items())
        key_data += f":{':'.join(f'{k}={v}' for k, v in sorted_kwargs)}"
    
    # Hash long keys to avoid Redis key length limits
    if len(key_data) > 200:
        key_data = f"{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    return key_data

def cache_response(
    prefix: str,
    ttl: int = 3600,
    vary_on_user: bool = False,
    vary_on_headers: List[str] = None
):
    """Decorator for caching API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and user info
            request = kwargs.get('request') or next((arg for arg in args if isinstance(arg, Request)), None)
            current_user = kwargs.get('current_user')
            
            # Build cache key
            cache_key_parts = [prefix]
            
            # Add function arguments to cache key
            for arg in args:
                if not isinstance(arg, (Request, User)):
                    cache_key_parts.append(str(arg))
            
            for key, value in kwargs.items():
                if key not in ['request', 'current_user'] and not callable(value):
                    cache_key_parts.append(f"{key}={value}")
            
            # Vary on user if required
            if vary_on_user and current_user:
                cache_key_parts.append(f"user={current_user.id}")
            
            # Vary on specific headers
            if vary_on_headers and request:
                for header in vary_on_headers:
                    header_value = request.headers.get(header.lower())
                    if header_value:
                        cache_key_parts.append(f"header_{header}={header_value}")
            
            cache_key = generate_cache_key(*cache_key_parts)
            
            # Try to get from cache
            cached_response = redis_client.get(cache_key)
            if cached_response:
                try:
                    cached_data = json.loads(cached_response)
                    return cached_data
                except json.JSONDecodeError:
                    pass
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            # Cache the result
            try:
                redis_client.set(cache_key, json.dumps(result, default=str), ex=ttl)
            except (TypeError, ValueError) as e:
                # Handle non-serializable responses
                logger.warning(f"Failed to cache response: {e}")
            
            return result
        
        return wrapper
    return decorator

# ETag support for conditional requests
def generate_etag(data: Any) -> str:
    """Generate ETag from response data"""
    content = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(content.encode()).hexdigest()

def handle_conditional_request(request: Request, response_data: Any) -> Optional[Response]:
    """Handle If-None-Match and If-Modified-Since headers"""
    
    # Generate ETag for current data
    current_etag = generate_etag(response_data)
    
    # Check If-None-Match header
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == f'"{current_etag}"':
        return Response(status_code=304, headers={"ETag": f'"{current_etag}"'})
    
    return None

@app.get("/users/{user_id}/cached")
@cache_response("user_detail", ttl=1800, vary_on_user=True)
async def get_user_cached(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_flexible)
):
    """Cached user endpoint with ETag support"""
    
    # Simulate database query
    user_data = {
        "id": user_id,
        "username": f"user_{user_id}",
        "email": f"user_{user_id}@example.com",
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }
    
    # Check conditional request
    conditional_response = handle_conditional_request(request, user_data)
    if conditional_response:
        return conditional_response
    
    # Add caching headers
    etag = generate_etag(user_data)
    cache_control = "private, max-age=1800"  # 30 minutes
    
    return JSONResponse(
        content=user_data,
        headers={
            "ETag": f'"{etag}"',
            "Cache-Control": cache_control,
            "Last-Modified": datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
        }
    )

# Cache invalidation
class CacheManager:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate cache keys matching pattern"""
        # In real Redis, use SCAN with pattern matching
        keys_to_delete = []
        for key in self.redis.data.keys():
            if pattern in key:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            self.redis.delete(key)
    
    def invalidate_user_cache(self, user_id: int):
        """Invalidate all cache entries for a specific user"""
        self.invalidate_pattern(f"user={user_id}")
        self.invalidate_pattern(f"user_detail:{user_id}")
    
    def invalidate_list_caches(self):
        """Invalidate list/collection caches"""
        patterns = ["users_list", "products_list", "orders_list"]
        for pattern in patterns:
            self.invalidate_pattern(pattern)

cache_manager = CacheManager(redis_client)

@app.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: dict,
    current_user: User = Depends(get_current_user_flexible)
):
    """Update user and invalidate related caches"""
    
    # Update user in database
    # ... database update logic ...
    
    # Invalidate related caches
    cache_manager.invalidate_user_cache(user_id)
    cache_manager.invalidate_list_caches()
    
    return {"message": "User updated successfully", "user_id": user_id}

# Response compression
@app.middleware("http")
async def compression_middleware(request: Request, call_next):
    """Add response compression"""
    response = await call_next(request)
    
    # Check if client accepts compression
    accept_encoding = request.headers.get("accept-encoding", "")
    
    if "gzip" in accept_encoding and response.headers.get("content-type", "").startswith("application/json"):
        # Add compression headers
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Vary"] = "Accept-Encoding"
    
    return response

# Database query optimization
@app.get("/users/optimized")
async def get_users_optimized(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: Optional[str] = Query(None, description="Comma-separated fields to return"),
    include_profile: bool = Query(False, description="Include user profile data")
):
    """Optimized user listing with field selection and optional joins"""
    
    # Field selection to reduce payload size
    default_fields = ["id", "username", "email", "created_at"]
    if fields:
        requested_fields = [f.strip() for f in fields.split(",")]
        # Validate requested fields
        allowed_fields = default_fields + ["full_name", "last_login", "status"]
        selected_fields = [f for f in requested_fields if f in allowed_fields]
    else:
        selected_fields = default_fields
    
    # Simulate optimized database query
    base_query = f"SELECT {', '.join(selected_fields)} FROM users"
    
    if include_profile:
        # Only join profile table if requested
        base_query += " LEFT JOIN user_profiles ON users.id = user_profiles.user_id"
        selected_fields.extend(["profile.bio", "profile.avatar_url"])
    
    # Pagination
    offset = (page - 1) * limit
    base_query += f" LIMIT {limit} OFFSET {offset}"
    
    # Mock response with only selected fields
    users = []
    for i in range(1, limit + 1):
        user = {}
        if "id" in selected_fields:
            user["id"] = offset + i
        if "username" in selected_fields:
            user["username"] = f"user_{offset + i}"
        if "email" in selected_fields:
            user["email"] = f"user_{offset + i}@example.com"
        if "created_at" in selected_fields:
            user["created_at"] = "2024-01-01T00:00:00Z"
        
        if include_profile:
            user["profile"] = {
                "bio": f"Bio for user {offset + i}",
                "avatar_url": f"/avatars/user_{offset + i}.jpg"
            }
        
        users.append(user)
    
    return {
        "data": users,
        "optimization_info": {
            "fields_selected": selected_fields,
            "profile_included": include_profile,
            "estimated_query": base_query,
            "performance_notes": [
                "Field selection reduces payload size",
                "Optional joins prevent unnecessary data loading",
                "Pagination limits memory usage"
            ]
        }
    }

```
--
## 14. Monitoring & Observability

### Request Logging and Metrics

Comprehensive logging and monitoring setup:

```python
from fastapi import FastAPI, Request, Response
import logging
import time
import psutil
import json
from datetime import datetime
from typing import Dict, Any
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import asyncio

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create logger
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

ACTIVE_CONNECTIONS = Gauge(
    'api_active_connections',
    'Active API connections'
)

ERROR_COUNT = Counter(
    'api_errors_total',
    'Total API errors',
    ['error_type', 'endpoint']
)

CACHE_HITS = Counter(
    'api_cache_hits_total',
    'Cache hits',
    ['cache_type']
)

CACHE_MISSES = Counter(
    'api_cache_misses_total',
    'Cache misses',
    ['cache_type']
)

# System metrics
SYSTEM_CPU_USAGE = Gauge('system_cpu_usage_percent', 'System CPU usage')
SYSTEM_MEMORY_USAGE = Gauge('system_memory_usage_percent', 'System memory usage')

class MetricsCollector:
    """Collect and expose application metrics"""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_stats = {
            'total_requests': 0,
            'error_count': 0,
            'avg_response_time': 0.0
        }
    
    def record_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record request metrics"""
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Update internal stats
        self.request_stats['total_requests'] += 1
        if status_code >= 400:
            self.request_stats['error_count'] += 1
            ERROR_COUNT.labels(error_type=f"{status_code}", endpoint=endpoint).inc()
        
        # Update average response time
        current_avg = self.request_stats['avg_response_time']
        total_requests = self.request_stats['total_requests']
        self.request_stats['avg_response_time'] = (
            (current_avg * (total_requests - 1) + duration) / total_requests
        )
    
    def get_uptime(self) -> float:
        return time.time() - self.start_time
    
    def collect_system_metrics(self):
        """Collect system-level metrics"""
        SYSTEM_CPU_USAGE.set(psutil.cpu_percent())
        SYSTEM_MEMORY_USAGE.set(psutil.virtual_memory().percent)

metrics_collector = MetricsCollector()

# Logging middleware with structured logs
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Comprehensive request/response logging"""
    
    start_time = time.time()
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    
    # Extract request information
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Log request start
    request_log_data = {
        "event": "request_start",
        "request_id": request_id,
        "method": request.method,
        "url": str(request.url),
        "path": request.url.path,
        "query_params": dict(request.query_params),
        "client_ip": client_ip,
        "user_agent": user_agent,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    logger.info("Request started", extra=request_log_data)
    
    # Process request
    try:
        ACTIVE_CONNECTIONS.inc()
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log response
        response_log_data = {
            "event": "request_complete",
            "request_id": request_id,
            "status_code": response.status_code,
            "process_time": round(process_time, 4),
            "response_size": response.headers.get("content-length"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        # Add custom response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(round(process_time, 4))
        
        # Record metrics
        endpoint = request.url.path
        metrics_collector.record_request(
            request.method, endpoint, response.status_code, process_time
        )
        
        # Log based on status code
        if response.status_code >= 400:
            logger.warning("Request failed", extra=response_log_data)
        else:
            logger.info("Request completed", extra=response_log_data)
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        
        # Log error
        error_log_data = {
            "event": "request_error",
            "request_id": request_id,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "process_time": round(process_time, 4),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        logger.error("Request error", extra=error_log_data, exc_info=True)
        
        # Record error metrics
        ERROR_COUNT.labels(error_type=type(e).__name__, endpoint=request.url.path).inc()
        
        raise
    
    finally:
        ACTIVE_CONNECTIONS.dec()

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime": metrics_collector.get_uptime(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with dependencies"""
    
    checks = {
        "api": {"status": "healthy", "response_time": 0.001},
        "database": {"status": "unknown", "response_time": None},
        "cache": {"status": "unknown", "response_time": None},
        "external_service": {"status": "unknown", "response_time": None}
    }
    
    # Check database connectivity
    try:
        db_start = time.time()
        # Simulate database ping
        await asyncio.sleep(0.01)  # Mock DB query
        checks["database"] = {
            "status": "healthy",
            "response_time": round(time.time() - db_start, 4)
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "response_time": None
        }
    
    # Check cache connectivity
    try:
        cache_start = time.time()
        redis_client.get("health_check")
        checks["cache"] = {
            "status": "healthy",
            "response_time": round(time.time() - cache_start, 4)
        }
    except Exception as e:
        checks["cache"] = {
            "status": "unhealthy",
            "error": str(e),
            "response_time": None
        }
    
    # Overall status
    overall_status = "healthy"
    if any(check["status"] == "unhealthy" for check in checks.values()):
        overall_status = "unhealthy"
    elif any(check["status"] == "unknown" for check in checks.values()):
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime": metrics_collector.get_uptime(),
        "checks": checks,
        "system": {
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    
    # Collect current system metrics
    metrics_collector.collect_system_metrics()
    
    # Generate Prometheus format
    metrics_output = generate_latest()
    
    return Response(
        content=metrics_output,
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )

@app.get("/metrics/application")
async def get_application_metrics():
    """Custom application metrics in JSON format"""
    
    return {
        "uptime_seconds": metrics_collector.get_uptime(),
        "request_stats": metrics_collector.request_stats,
        "system_stats": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "active_connections": len(asyncio.all_tasks())
        },
        "api_stats": {
            "endpoints_count": len(app.routes),
            "cache_hit_rate": calculate_cache_hit_rate(),
            "error_rate": calculate_error_rate()
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def calculate_cache_hit_rate() -> float:
    """Calculate cache hit rate"""
    # Mock calculation - in production, use actual cache metrics
    return 0.85  # 85% hit rate

def calculate_error_rate() -> float:
    """Calculate error rate"""
    stats = metrics_collector.request_stats
    if stats['total_requests'] == 0:
        return 0.0
    return stats['error_count'] / stats['total_requests']

# Request tracing for distributed systems
class RequestTracer:
    """Simple request tracing for distributed systems"""
    
    def __init__(self):
        self.traces = {}
    
    def start_trace(self, request_id: str, operation: str) -> str:
        """Start a new trace span"""
        span_id = str(uuid.uuid4())
        
        if request_id not in self.traces:
            self.traces[request_id] = []
        
        self.traces[request_id].append({
            "span_id": span_id,
            "operation": operation,
            "start_time": time.time(),
            "end_time": None,
            "duration": None,
            "tags": {}
        })
        
        return span_id
    
    def finish_trace(self, request_id: str, span_id: str, tags: Dict[str, Any] = None):
        """Finish a trace span"""
        if request_id in self.traces:
            for span in self.traces[request_id]:
                if span["span_id"] == span_id:
                    span["end_time"] = time.time()
                    span["duration"] = span["end_time"] - span["start_time"]
                    if tags:
                        span["tags"].update(tags)
                    break
    
    def get_trace(self, request_id: str) -> Dict[str, Any]:
        """Get complete trace for request"""
        return {
            "request_id": request_id,
            "spans": self.traces.get(request_id, []),
            "total_duration": sum(
                span.get("duration", 0) 
                for span in self.traces.get(request_id, [])
                if span.get("duration")
            )
        }

tracer = RequestTracer()

@app.get("/trace/{request_id}")
async def get_request_trace(request_id: str):
    """Get distributed trace for a request"""
    trace_data = tracer.get_trace(request_id)
    
    if not trace_data["spans"]:
        raise HTTPException(status_code=404, detail="Trace not found")
    
    return trace_data

# Example traced endpoint
@app.get("/users/{user_id}/traced")
async def get_user_with_tracing(
    user_id: int,
    request: Request
):
    """Example endpoint with distributed tracing"""
    
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    
    # Start main operation trace
    main_span = tracer.start_trace(request_id, "get_user")
    
    try:
        # Trace database operation
        db_span = tracer.start_trace(request_id, "database_query")
        await asyncio.sleep(0.05)  # Simulate DB query
        tracer.finish_trace(request_id, db_span, {"table": "users", "query_type": "select"})
        
        # Trace cache operation
        cache_span = tracer.start_trace(request_id, "cache_lookup")
        await asyncio.sleep(0.01)  # Simulate cache lookup
        tracer.finish_trace(request_id, cache_span, {"cache_type": "redis", "hit": False})
        
        # Simulate user data
        user_data = {
            "id": user_id,
            "username": f"user_{user_id}",
            "email": f"user_{user_id}@example.com"
        }
        
        tracer.finish_trace(request_id, main_span, {"user_found": True})
        
        return {
            "data": user_data,
            "trace_id": request_id,
            "trace_url": f"/trace/{request_id}"
        }
        
    except Exception as e:
        tracer.finish_trace(request_id, main_span, {"error": str(e)})
        raise
```
---

## Common Pitfalls & Best Practices

### API Design Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Best Practice | Explanation |
|----------------|------------------|-------------|
| `/getUsers` | `/users` | Use nouns, not verbs in URLs |
| `/user/123` | `/users/123` | Use plural nouns for consistency |
| `/users?id=1,2,3` | `/users?ids=1,2,3` or `/users/bulk` | Clear parameter naming for multiple IDs |
| `POST /users/123/delete` | `DELETE /users/123` | Use proper HTTP methods |
| Mixed status codes for similar errors | Consistent status code mapping | Same error types should return same status codes |
| Exposing internal IDs | UUIDs or encoded IDs | Prevent enumeration attacks |
| No API versioning | Clear versioning strategy | Plan for API evolution from day one |
| Inconsistent error formats | Standardized error structure | Same error format across all endpoints |
| No rate limiting | Implement rate limiting | Protect against abuse and overload |
| Synchronous file uploads | Asynchronous processing | Handle large uploads properly |

### Performance Optimization Checklist

**Database Optimization:**
- [ ] Use appropriate indexes for query patterns
- [ ] Implement connection pooling
- [ ] Use read replicas for read-heavy operations
- [ ] Implement query result caching
- [ ] Avoid N+1 query problems
- [ ] Use pagination for large result sets
- [ ] Implement database query timeouts

**API Response Optimization:**
- [ ] Use field selection/sparse fieldsets
- [ ] Implement response compression (gzip)
- [ ] Add appropriate caching headers
- [ ] Use ETags for conditional requests
- [ ] Minimize response payload size
- [ ] Implement response streaming for large datasets

**Security Checklist:**
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting implementation
- [ ] Authentication and authorization
- [ ] HTTPS enforcement
- [ ] Security headers configuration
- [ ] File upload security
- [ ] Audit logging

**Monitoring & Observability:**
- [ ] Request/response logging
- [ ] Error tracking and alerting
- [ ] Performance metrics collection
- [ ] Health check endpoints
- [ ] Distributed tracing
- [ ] Cache hit rate monitoring
- [ ] Database performance monitoring
- [ ] API usage analytics

### Testing Strategy Recommendations

```python
# Example comprehensive test structure for FastAPI

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers():
    # Mock authentication headers
    return {"Authorization": "Bearer mock_token"}

class TestUserEndpoints:
    """Comprehensive user endpoint tests"""
    
    def test_create_user_success(self, client):
        """Test successful user creation"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!",
            "full_name": "Test User"
        }
        
        response = client.post("/users", json=user_data)
        
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["username"] == user_data["username"]
    
    def test_create_user_validation_error(self, client):
        """Test user creation with invalid data"""
        invalid_data = {
            "username": "ab",  # Too short
            "email": "invalid-email",
            "password": "weak"
        }
        
        response = client.post("/users", json=invalid_data)
        
        assert response.status_code == 422
        error_detail = response.json()
        assert "validation_errors" in error_detail["detail"]
    
    def test_get_user_not_found(self, client):
        """Test getting non-existent user"""
        response = client.get("/users/99999")
        
        assert response.status_code == 404
        assert response.json()["error_code"] == "USER_NOT_FOUND"
    
    def test_authentication_required(self, client):
        """Test endpoint requiring authentication"""
        response = client.get("/users/me")
        
        assert response.status_code == 401
    
    def test_rate_limiting(self, client):
        """Test rate limiting functionality"""
        # Make multiple requests quickly
        for _ in range(101):  # Assuming 100 request limit
            response = client.get("/users")
            if response.status_code == 429:
                break
        
        assert response.status_code == 429
        assert "rate_limit" in response.json()["error_code"].lower()
    
    @patch('app.database.get_user')
    def test_database_error_handling(self, mock_get_user, client):
        """Test handling of database errors"""
        mock_get_user.side_effect = Exception("Database connection failed")
        
        response = client.get("/users/123")
        
        assert response.status_code == 500
        assert "INTERNAL_SERVER_ERROR" in response.json()["error_code"]

class TestAPIVersioning:
    """Test API versioning functionality"""
    
    def test_v1_endpoint(self, client):
        """Test version 1 endpoint"""
        response = client.get("/api/v1/users/123")
        
        assert response.status_code == 200
        # Verify v1 response structure
        
    def test_v2_endpoint(self, client):
        """Test version 2 endpoint"""
        response = client.get("/api/v2/users/123")
        
        assert response.status_code == 200
        # Verify v2 response structure with new fields
    
    def test_header_versioning(self, client):
        """Test version selection via headers"""
        headers = {"API-Version": "2.0"}
        response = client.get("/users/123", headers=headers)
        
        assert response.status_code == 200
        # Verify correct version was used

class TestPagination:
    """Test pagination functionality"""
    
    def test_default_pagination(self, client):
        """Test default pagination parameters"""
        response = client.get("/users")
        
        assert response.status_code == 200
        data = response.json()
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 10
    
    def test_custom_pagination(self, client):
        """Test custom pagination parameters"""
        response = client.get("/users?page=2&limit=20")
        
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["limit"] == 20
    
    def test_pagination_limits(self, client):
        """Test pagination parameter limits"""
        response = client.get("/users?page=0&limit=1000")
        
        assert response.status_code == 400  # Invalid page
        
        response = client.get("/users?page=1&limit=1000")
        
        # Should enforce maximum limit
        data = response.json()
        assert data["pagination"]["limit"] <= 100

class TestSorting:
    """Test sorting functionality"""
    
    def test_default_sorting(self, client):
        """Test default sort order"""
        response = client.get("/users")
        
        assert response.status_code == 200
        # Verify default sort is applied
    
    def test_custom_sorting(self, client):
        """Test custom sort parameters"""
        response = client.get("/users?sort=username:asc,created_at:desc")
        
        assert response.status_code == 200
        # Verify sort was applied correctly
    
    def test_invalid_sort_field(self, client):
        """Test sorting with invalid field"""
        response = client.get("/users?sort=invalid_field:asc")
        
        assert response.status_code == 400
        assert "invalid sort field" in response.json()["detail"]["message"].lower()
```

#### Load testing example with locust
```python
from locust import HttpUser, task, between

class APILoadTest(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login or setup authentication
        pass
    
    @task(3)
    def get_users(self):
        self.client.get("/users")
    
    @task(2)
    def get_user_detail(self):
        user_id = random.randint(1, 1000)
        self.client.get(f"/users/{user_id}")
    
    @task(1)
    def create_user(self):
        user_data = {
            "username": f"testuser_{random.randint(1, 10000)}",
            "email": f"test_{random.randint(1, 10000)}@example.com",
            "password": "TestPass123!"
        }
        self.client.post("/users", json=user_data)
```

---

## References & Standards

### Industry Standards & RFCs

- **RFC 7231** - HTTP/1.1 Semantics and Content
- **RFC 7232** - HTTP/1.1 Conditional Requests
- **RFC 7233** - HTTP/1.1 Range Requests
- **RFC 7234** - HTTP/1.1 Caching
- **RFC 7235** - HTTP/1.1 Authentication
- **RFC 6585** - Additional HTTP Status Codes
- **RFC 3986** - Uniform Resource Identifier (URI): Generic Syntax
- **OpenAPI Specification 3.0+** - API Documentation Standard
- **JSON Schema** - JSON Data Validation
- **OAuth 2.0 (RFC 6749)** - Authorization Framework
- **JWT (RFC 7519)** - JSON Web Tokens

### FastAPI-Specific Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Pydantic Documentation**: https://pydantic-docs.helpmanual.io/
- **Starlette Documentation**: https://www.starlette.io/
- **OpenAPI Generator**: https://openapi-generator.tech/

### API Design Guidelines

- **Google API Design Guide**: https://cloud.google.com/apis/design
- **Microsoft REST API Guidelines**: https://github.com/Microsoft/api-guidelines
- **Zalando RESTful API Guidelines**: https://opensource.zalando.com/restful-api-guidelines/
- **JSON:API Specification**: https://jsonapi.org/

### Security Resources

- **OWASP API Security Top 10**: https://owasp.org/www-project-api-security/
- **OWASP Cheat Sheet Series**: https://cheatsheetseries.owasp.org/
- **CWE (Common Weakness Enumeration)**: https://cwe.mitre.org/

### Performance & Monitoring

- **Prometheus Documentation**: https://prometheus.io/docs/
- **OpenTelemetry**: https://opentelemetry.io/
- **HTTP Archive (HAR) Specification**: https://w3c.github.io/web-performance/specs/HAR/Overview.html

---

This comprehensive guide provides enterprise-ready patterns for building robust, scalable RESTful APIs with FastAPI. Each section includes practical examples, security considerations, and performance optimizations to ensure your APIs meet industry standards and can scale to handle production workloads effectively.