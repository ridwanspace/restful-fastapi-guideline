# 🚀 RESTful FastAPI Guidelines

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MDX](https://img.shields.io/badge/MDX-1B1F24?style=for-the-badge&logo=mdx&logoColor=white)

![REST API](https://img.shields.io/badge/REST-API-blue?style=for-the-badge)
![HTTP](https://img.shields.io/badge/HTTP-Protocol-green?style=for-the-badge)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-brightgreen?style=for-the-badge&logo=openapi-initiative)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![JSON](https://img.shields.io/badge/json-5E5C5C?style=for-the-badge&logo=json&logoColor=white)

![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI-red?style=for-the-badge)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-orange?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

![Testing](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
![VS Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)

![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)
![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=for-the-badge)

*A comprehensive, progressive guide to building robust and scalable RESTful APIs with FastAPI, using intuitive restaurant analogies.*

## 📋 Overview

This project is a complete learning journey for building production-ready RESTful APIs with FastAPI. Using a **"Restaurant Analogy,"** we make complex API concepts intuitive and easy to grasp. Whether you're a beginner or an experienced developer, this guide offers a structured path from fundamental concepts to advanced enterprise-grade patterns.

## 🎯 What You'll Learn

### 🌟 **Progressive Learning Journey**
- **Getting Started**: Learn the basics of REST, HTTP, and build your first API "restaurant."
- **Foundation**: Establish a solid base with production-ready patterns for validation, error handling, and project structure.
- **Intermediate**: Dive into advanced topics like filtering, pagination, security, and performance optimization.
- **Advanced & Enterprise**: Master enterprise-grade features like WebSockets, microservices, and cloud deployment.

### 🛠️ **Practical Skills**
- Design and build RESTful APIs with FastAPI from scratch.
- Apply industry best practices for API design, security, and performance.
- Implement robust data validation with Pydantic.
- Develop a scalable and maintainable project structure.
- Write effective tests to ensure API reliability.
- Deploy FastAPI applications using Docker and serverless technologies.

## 📚 Documentation Structure

Our documentation is structured as a progressive learning path, taking you from a simple "café" to a full-fledged "restaurant chain."

```mermaid
graph TD
    A[🚀 Getting Started] --> B[🏛️ Foundation]
    B --> C[🚀 Intermediate]
    C --> D[🏢 Advanced]

    subgraph A [Getting Started]
        A1[What is REST?]
        A2[HTTP Methods]
        A3[URI Design]
        A4[First API]
    end

    subgraph B [Foundation]
        B1[Request Handling]
        B2[Data Validation]
        B3[Error Handling]
        B4[Project Structure]
    end

    subgraph C [Intermediate]
        C1[Filtering & Pagination]
        C2[Authentication]
        C3[Performance]
        C4[Monitoring]
    end

    subgraph D [Advanced]
        D1[WebSockets]
        D2[Microservices]
        D3[Idempotency]
        D4[Deployment]
    end

    style A fill:#e1f5fe,color:#3b3b3b
    style B fill:#f3e5f5,color:#3b3b3b
    style C fill:#fff3e0,color:#3b3b3b
    style D fill:#e8f5e8,color:#3b3b3b
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** installed
- **Node.js 18+** for documentation
- **Git** for version control
- **Code editor** (VS Code recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/ridwanspace/restful-fastapi-guideline.git
cd restful-fastapi-guideline
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies for documentation
npm install

# For FastAPI development (examples in docs)
pip install fastapi uvicorn pydantic
```

### 3. Start the Documentation Server
```bash
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) to access the landing page.
- Open [http://localhost:3000/docs](http://localhost:3000/docs) to access the complete documentation.

### 4. Follow the Learning Path
Start with [Getting Started](/docs/01_getting-started) and progress through each section:

```bash
# Navigate to each section in order:
1. 🚀 Getting Started    → /docs/01_getting-started
2. 🏛️ Foundation        → /docs/02_foundation
3. 🚀 Intermediate      → /docs/03_intermediate
4. 🏢 Advanced          → /docs/04_advanced
```

## 📖 Documentation Sections

### 🚀 [Getting Started](/docs/01_getting-started)
Perfect for beginners. Learn the core concepts of REST and build your first API.
- **What is REST?**: Core principles explained with our restaurant analogy.
- **HTTP Methods**: Understand GET, POST, PUT, DELETE.
- **Your First API**: A hands-on tutorial to build your first "API restaurant."

### 🏛️ [Foundation](/docs/02_foundation)
Essential concepts for building production-ready APIs.
- **Request Handling**: Manage path/query parameters and request bodies.
- **Data Validation**: Ensure data integrity with Pydantic.
- **Error Handling**: Implement robust error handling strategies.
- **Project Structure**: Organize your code for scalability.

### 🚀 [Intermediate](/docs/03_intermediate)
Advanced patterns for more complex applications.
- **Filtering, Pagination & Sorting**: Efficiently handle large datasets.
- **Authentication & Authorization**: Secure your endpoints.
- **Performance Optimization**: Speed up your API with caching and other techniques.
- **Monitoring**: Gain insights into your API's performance.

### 🏢 [Advanced](/docs/04_advanced)
Enterprise-grade techniques for high-scale applications.
- **WebSockets**: Implement real-time communication.
- **Microservices**: Design your API as part of a larger ecosystem.
- **Idempotency**: Ensure reliable, repeatable operations.
- **Deployment**: Deploy your application using Docker and serverless.

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Documentation Framework** | Next.js + MDX | Interactive and beautiful documentation |
| **API Framework** | FastAPI | High-performance Python API framework |
| **Validation** | Pydantic | Robust data validation and settings management |
| **Styling** | Tailwind CSS | Modern and responsive design |
| **Diagrams** | Mermaid | Clear visual explanations of concepts |

## 🤝 Contributing

We welcome contributions! Please see our [contribution guidelines](./CONTRIBUTING.md) for more details on how to get involved.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.