# Getting Started with RESTful API Design in FastAPI

## Executive Summary

This guide provides a starting point for understanding and designing RESTful APIs using FastAPI. We'll cover the fundamental concepts to help you build your first API. The focus is on clarity and common practices.

## Basic URI Design & Naming

When designing your API, the URLs (URIs) should represent resources (things, nouns) rather than actions (verbs).

**Key Ideas:**
- Use lowercase letters: `/my-resource` instead of `/MyResource`.
- Use plural nouns for collections: `/users`, `/items`.
- Use nouns, not verbs: `/users` is good, `/getUsers` is not.

**Examples:**
| Method & URI          | Description                |
|-----------------------|----------------------------|
| `GET /users`          | Get a list of all users    |
| `POST /users`         | Create a new user          |
| `GET /users/123`      | Get user with ID 123       |

## Basic HTTP Methods

HTTP methods tell the server what action to perform on a resource.

- **`GET`**: Retrieve a resource. (e.g., get user details)
- **`POST`**: Create a new resource. (e.g., create a new user)
- **`PUT`**: Update an existing resource completely. (e.g., replace user details)
- **`PATCH`**: Partially update an existing resource. (e.g., update only a user's email)
- **`DELETE`**: Remove a resource. (e.g., delete a user)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# A simple model for our data
class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    is_offer: Optional[bool] = None

# In-memory "database"
fake_items_db = {}

@app.post("/items/")
async def create_item(item_id: int, item: Item):
    if item_id in fake_items_db:
        return {"error": "Item already exists"}
    fake_items_db[item_id] = item
    return {"item_id": item_id, **item.dict()}

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id not in fake_items_db:
        return {"error": "Item not found"}
    return {"item_id": item_id, **fake_items_db[item_id].dict()}
```

## Installing FastAPI

To get started with FastAPI, you'll need to install it and an ASGI server like Uvicorn.

```bash
pip install fastapi uvicorn
```

To run a FastAPI application (e.g., saved in `main.py`):

```bash
uvicorn main:app --reload
```
This command tells Uvicorn to run the `app` object from your `main.py` file. The `--reload` flag makes the server restart after code changes, which is useful for development.

This is just the beginning! As you build more complex APIs, you'll explore more advanced topics covered in our Beginner, Intermediate, and Advanced guidelines.