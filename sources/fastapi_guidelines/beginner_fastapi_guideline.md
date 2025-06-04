# Beginner's Guide to RESTful API Design with FastAPI

## Executive Summary

Welcome to the Beginner's Guide for FastAPI! This document builds upon the "Getting Started" guide and introduces more foundational concepts for building well-structured RESTful APIs. We'll explore data validation, parameters, basic error handling, and response structuring.

## Recap: Core Concepts

Before diving deeper, let's quickly recap:

*   **URI Design**: Use plural nouns for resources (e.g., `/items`, `/users`). Keep them lowercase and use hyphens for separation (e.g., `/product-categories`).
*   **HTTP Methods**:
    *   `GET`: Retrieve data.
    *   `POST`: Create new data.
    *   `PUT`: Update existing data (replace).
    *   `PATCH`: Partially update existing data.
    *   `DELETE`: Remove data.

## Data Validation with Pydantic Models

FastAPI uses Pydantic models for data validation and serialization. This ensures that the data your API receives and sends is in the correct format.

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tags: List[str] = []

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    tags: List[str] = []

# In-memory "database"
fake_items_db = {}
item_id_counter = 0

@app.post("/items/", response_model=ItemResponse)
async def create_item(item: ItemCreate):
    global item_id_counter
    item_id_counter += 1
    item_data = item.dict()
    fake_items_db[item_id_counter] = item_data
    return {"id": item_id_counter, **item_data}
```
In this example, `ItemCreate` defines the expected structure for creating an item, and `ItemResponse` defines how an item is returned. FastAPI automatically validates incoming data against `ItemCreate`.

## Path and Query Parameters

FastAPI makes it easy to define path and query parameters with type hints and validation.

*   **Path Parameters**: Part of the URL path, used to identify a specific resource.
*   **Query Parameters**: Added to the end of the URL after a `?`, used for filtering, sorting, or pagination.

```python
from fastapi import FastAPI, Path, Query
from typing import Optional

app = FastAPI()

@app.get("/items/{item_id}")  # item_id is a path parameter
async def read_item(
    item_id: int = Path(..., title="The ID of the item to get", ge=1), 
    q: Optional[str] = Query(None, title="Query string", min_length=3) # q is an optional query parameter
):
    results = {"item_id": item_id}
    if q:
        results.update({"q": q})
    # In a real app, you'd fetch the item from a database
    if item_id > 100: # Simulate item not found
         return {"error": "Item not found"}
    return results

@app.get("/users/")
async def read_users(
    skip: int = Query(0, ge=0, description="Number of items to skip"), 
    limit: int = Query(10, ge=1, le=100, description="Maximum number of items to return")
):
    # Simulate fetching users with pagination
    all_users = [{"id": i, "name": f"User {i}"} for i in range(1, 150)]
    return all_users[skip : skip + limit]
```
Here, `Path(..., ge=1)` ensures `item_id` is greater than or equal to 1. `Query(None, min_length=3)` makes `q` optional and requires a minimum length of 3 if provided.

## Basic Error Handling

FastAPI allows you to raise `HTTPException` to return HTTP error responses.

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

items = {"foo": "The Foo Wrestlers"}

@app.get("/items-error/{item_id}")
async def read_item_error(item_id: str):
    if item_id not in items:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item": items[item_id]}
```
If an `item_id` is requested that doesn't exist, a 404 error with a JSON body `{"detail": "Item not found"}` is returned.

## Basic API Versioning (URL-based)

A simple way to version your API is by including the version in the URL.

```python
from fastapi import FastAPI, APIRouter

app = FastAPI()

router_v1 = APIRouter(prefix="/api/v1")

@router_v1.get("/greet")
async def greet_v1():
    return {"message": "Hello from API v1"}

app.include_router(router_v1)

# You could define a router_v2 for a future version
# router_v2 = APIRouter(prefix="/api/v2")
# @router_v2.get("/greet")
# async def greet_v2():
#     return {"message": "Hello from API v2 with new features!"}
# app.include_router(router_v2)
```
Clients would then access `/api/v1/greet`.

## Response Models

Using `response_model` in your path operation decorators ensures that the response data conforms to a specific Pydantic model, filtering out any extra data. This is good for security and predictability.

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class UserIn(BaseModel):
    username: str
    password: str
    email: str
    full_name: Optional[str] = None

class UserOut(BaseModel): # This is our response model
    username: str
    email: str
    full_name: Optional[str] = None

@app.post("/users/", response_model=UserOut)
async def create_user(user: UserIn):
    # In a real app, you would save the user to a database
    # The password will not be returned because it's not in UserOut
    return user 
```
Even though `UserIn` includes a password, the `/users/` endpoint will only return fields defined in `UserOut`.

## Next Steps

You've now covered the beginner topics for FastAPI! To continue learning and build more robust APIs, please refer to our:
-   **Intermediate FastAPI Guidelines**: Covers more detailed request/response formatting, status codes, and error handling.
-   **Advanced FastAPI Guidelines**: Dives into filtering, searching, pagination, security, performance, and monitoring.