"use client";
import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/50 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2" prefetch={false}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-sky-400"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-xl font-bold">RESTful FastAPI Guidelines</span>
          </Link>
          {/* Right side items */}
          <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link href="#learning-path" className="hover:text-sky-400 transition-colors" prefetch={false}>
                Learning Path
              </Link>
              <Link href="#use-cases" className="hover:text-sky-400 transition-colors" prefetch={false}>
                Use Cases
              </Link>
              <Link href="/docs" className="hover:text-sky-400 transition-colors" prefetch={false}>
                Documentation
              </Link>
              <Link href="#examples" className="hover:text-sky-400 transition-colors" prefetch={false}>
                Examples
              </Link>
              <Link
                href="https://github.com/ridwanspace/restful-fastapi-guideline"
                className="hover:text-sky-400 transition-colors flex items-center gap-2"
                prefetch={false}
                target="_blank"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                <span>GitHub</span>
              </Link>
            </nav>

            {/* Start Learning Button */}
            <Link
              href="/docs/01_getting-started"
              className="hidden md:inline-flex h-9 items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700 disabled:pointer-events-none disabled:opacity-50"
              prefetch={false}
            >
              Start Learning
            </Link>

            {/* Hamburger Menu Button for Mobile */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-700" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="#learning-path" className="text-slate-300 hover:bg-slate-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
                Learning Path
              </Link>
              <Link href="#use-cases" className="text-slate-300 hover:bg-slate-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
                Use Cases
              </Link>
              <Link href="/docs" className="text-slate-300 hover:bg-slate-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
                Documentation
              </Link>
              <Link href="#examples" className="text-slate-300 hover:bg-slate-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium" prefetch={false} onClick={() => setIsMobileMenuOpen(false)}>
                Examples
              </Link>
              <Link
                href="https://github.com/ridwanspace/restful-fastapi-guideline"
                className="text-slate-300 hover:bg-slate-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                prefetch={false}
                target="_blank"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  <span>GitHub</span>
                </div>
              </Link>
              <Link
                href="/docs/01_getting-started"
                className="bg-sky-500 text-white block px-3 py-2 rounded-md text-base font-medium text-center hover:bg-sky-600 mt-2"
                prefetch={false}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Start Learning
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 lg:py-40 bg-gradient-to-b from-slate-800/50 to-transparent">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                🍽️ Restaurant Analogy • 🎯 Progressive Learning • 🚀 Production Ready
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Master RESTful APIs with</span>
              <span className="block text-sky-400">FastAPI</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-300 sm:text-xl md:text-2xl">
              A comprehensive, progressive guide to building robust and scalable RESTful APIs with FastAPI. From fundamental concepts to advanced enterprise-grade patterns, using <span className="text-sky-400 font-semibold">restaurant analogies</span> that make complex concepts intuitive.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/docs/01_getting-started"
                className="inline-flex h-12 items-center justify-center rounded-md bg-sky-500 px-8 text-lg font-semibold text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700"
                prefetch={false}
              >
                🚀 Start Your Journey
              </Link>
              <Link
                href="/docs/01_getting-started/your-first-api"
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-600 bg-transparent px-8 text-lg font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
                prefetch={false}
              >
                🍽️ Build Your API Restaurant
              </Link>
            </div>
          </div>
        </section>

        {/* Learning Path Section */}
        <section id="learning-path" className="py-16 md:py-24 bg-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Progressive Learning Journey</h2>
              <p className="mt-4 text-lg text-slate-300">
                From complete beginner to enterprise architect - follow our structured path designed by industry experts.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                { 
                  title: "🚀 Getting Started", 
                  description: "Begin your journey with the basics of RESTful APIs, HTTP methods, URI design, and setting up your first FastAPI application.",
                  icon: "🏪", 
                  level: "Beginner",
                  color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
                  href: "/docs/01_getting-started"
                },
                { 
                  title: "🏛️ Foundation", 
                  description: "Build a solid understanding of core FastAPI concepts, including request/response handling, data validation, error handling, and project structure.",
                  icon: "👨‍🍳", 
                  level: "Beginner+",
                  color: "bg-blue-500/20 border-blue-500/30 text-blue-300",
                  href: "/docs/02_foundation"
                },
                { 
                  title: "🚀 Intermediate", 
                  description: "Dive deeper into practical patterns like filtering, pagination, sorting, advanced security, performance optimization, and monitoring.",
                  icon: "🎯", 
                  level: "Intermediate",
                  color: "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
                  href: "/docs/03_intermediate"
                },
                { 
                  title: "🔥 Advanced", 
                  description: "Explore enterprise-grade features such as WebSockets, webhooks, background tasks, microservices architecture, idempotency, and cloud deployment strategies.",
                  icon: "⚡", 
                  level: "Advanced",
                  color: "bg-orange-500/20 border-orange-500/30 text-orange-300",
                  href: "/docs/04_advanced"
                },
                { 
                  title: "🏢 Enterprise", 
                  description: "WebSockets, microservices, background tasks, idempotency, and cloud-native deployment patterns.",
                  icon: "🌟",
                  level: "Expert",
                  color: "bg-purple-500/20 border-purple-500/30 text-purple-300",
                  href: "/docs/04_advanced"
                },
              ].map((stage) => (
                <div key={stage.title} className="bg-slate-700/50 p-6 rounded-lg shadow-lg hover:shadow-sky-500/20 transition-all duration-300 border border-slate-600/50 hover:border-sky-500/30">
                  <div className="text-4xl mb-4">{stage.icon}</div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mb-3 border ${stage.color}`}>
                    {stage.level}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-sky-300">{stage.title}</h3>
                  <p className="text-slate-300 text-sm mb-4">{stage.description}</p>
                  <Link
                    href={stage.href}
                    className="inline-flex items-center text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                    prefetch={false}
                  >
                    Start Learning →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Our Approach Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Why Our Restaurant Analogy Works</h2>
              <p className="mt-4 text-lg text-slate-300">
                Complex API concepts become intuitive when explained through familiar restaurant operations.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                { 
                  title: "🍽️ Intuitive Learning", 
                  description: "FastAPI endpoints = restaurant menu items. HTTP methods = different ways customers interact. Data models = professional kitchen standards.", 
                  icon: "🧠" 
                },
                { 
                  title: "📊 Progressive Complexity", 
                  description: "Start with a simple café, evolve to a full restaurant, then scale to a restaurant chain. Each level builds naturally on the previous.", 
                  icon: "📈" 
                },
                { 
                  title: "🎯 Real-World Patterns", 
                  description: "Every concept maps to production patterns: order validation, kitchen workflows, customer service, quality control.", 
                  icon: "🌍" 
                },
                { 
                  title: "💻 Hands-On Practice", 
                  description: "Build a complete Task Manager API step-by-step, with detailed explanations and production-ready code examples.", 
                  icon: "⚡" 
                },
                { 
                  title: "🛡️ Enterprise Ready", 
                  description: "Learn patterns used by companies serving millions: error handling, monitoring, security, scaling, and deployment.", 
                  icon: "🏢" 
                },
                { 
                  title: "📚 Comprehensive Docs", 
                  description: "Interactive examples, visual diagrams, troubleshooting guides, and real-world use cases for every concept.", 
                  icon: "🎓" 
                },
              ].map((feature) => (
                <div key={feature.title} className="bg-slate-700/50 p-6 rounded-lg shadow-lg hover:shadow-sky-500/20 transition-shadow border border-slate-600/30">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-sky-300">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-16 md:py-24 bg-slate-800/70">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Real-World Applications</h2>
              <p className="mt-4 text-lg text-slate-300">
                Our patterns are battle-tested in production environments across diverse industries.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                { 
                  name: "🛒 E-Commerce", 
                  description: "Product catalogs, order management, payment processing, inventory tracking",
                  examples: ["Product APIs", "Cart Management", "Payment Webhooks", "Inventory Sync"],
                  pattern: "Inventory management, order processing workflows, payment webhook integrations"
                },
                { 
                  name: "🏦 FinTech", 
                  description: "Banking APIs, payment processors, trading platforms, compliance systems",
                  examples: ["Account APIs", "Transaction Processing", "Risk Management", "Audit Trails"],
                  pattern: "Transaction idempotency, real-time payment notifications, audit logging and compliance"
                },
                { 
                  name: "📱 Social Media", 
                  description: "User interactions, content management, real-time messaging, analytics",
                  examples: ["User Profiles", "Content APIs", "Chat Systems", "Feed Algorithms"],
                  pattern: "Chat systems, live dashboards, instant notifications, scalability"
                },
                { 
                  name: "🏥 Healthcare", 
                  description: "Patient records, appointment systems, telemedicine, data analytics",
                  examples: ["Patient APIs", "Scheduling", "Medical Records", "Integration"],
                  pattern: "Security, compliance, audit logging, data privacy"
                },
              ].map((useCase) => (
                <div key={useCase.name} className="bg-slate-800/80 p-6 rounded-lg shadow-lg border border-slate-600/50">
                  <h3 className="text-xl font-semibold mb-3 text-sky-300">{useCase.name}</h3>
                  <p className="text-slate-300 text-sm mb-4">{useCase.description}</p>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Common APIs:</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      {useCase.examples.map((example) => (
                        <li key={example} className="flex items-center">
                          <span className="w-1 h-1 bg-sky-400 rounded-full mr-2"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                    <strong>Key Patterns:</strong> {useCase.pattern}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Examples Section */}
        <section id="examples" className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Code Examples & Patterns</h2>
              <p className="mt-4 text-lg text-slate-300">
                From simple endpoints to enterprise patterns - see exactly how it&apos;s done.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { 
                  title: "🏪 Your First API Restaurant", 
                  description: "Build a complete, working API step-by-step, creating endpoints and handling different types of requests. Perfect for beginners learning REST fundamentals.",
                  code: `@app.post("/tasks", response_model=Task)
async def take_custom_order(task_order: TaskCreate) -> Task:
    """Take a new task order from customers"""
    # Kitchen prepares the order...
    return new_task`,
                  href: "/docs/01_getting-started/your-first-api",
                  level: "Beginner"
                },
                { 
                  title: "🔍 Advanced Query Patterns", 
                  description: "Implement sophisticated filtering, searching, and pagination strategies to help users find exactly what they need in enterprise applications.",
                  code: `@app.get("/api/v1/products")
async def search_products(
    q: str = None,
    category: str = None,
    min_price: float = None,
    page: int = 1
):
    # Complex filtering logic...`,
                  href: "/docs/04_advance/01-filtering-searching",
                  level: "Advanced"
                },
                { 
                  title: "🔄 WebSocket Integration", 
                  description: "Build interactive applications with real-time bidirectional communication using WebSockets, including connection management and scaling patterns.",
                  code: `@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Real-time communication...`,
                  href: "/docs/04_advanced/01-real-time-communication-websockets",
                  level: "Enterprise"
                },
                { 
                  title: "🛡️ Security & Authentication", 
                  description: "Implement enterprise-grade security patterns, including authentication (JWT), authorization, rate limiting, and input validation, to build a fortress-level security system.",
                  code: `@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Security checks and validation...
    return response`,
                  href: "/docs/04_advance/05-security-considerations",
                  level: "Advanced"
                },
                { 
                  title: "⚡ Background Tasks", 
                  description: "Implement robust background task processing for scalable, responsive applications using asynchronous patterns and task queues.",
                  code: `@app.post("/process")
async def process_data(background_tasks: BackgroundTasks):
    background_tasks.add_task(process_heavy_task)
    return {"status": "processing"}`,
                  href: "/docs/04_advanced/03-background-tasks-asynchronous-processing",
                  level: "Enterprise"
                },
                { 
                  title: "🐳 Docker & Deployment", 
                  description: "Containerize and orchestrate FastAPI applications for production deployments, ensuring consistent environments and scalable cloud deployment.",
                  code: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
# Optimized for production...`,
                  href: "/docs/04_advanced/07-containerization-orchestration-production",
                  level: "Enterprise"
                },
              ].map((example) => (
                <div key={example.title} className="bg-slate-700/50 p-6 rounded-lg shadow-lg border border-slate-600/30">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mb-3 ${
                    example.level === 'Beginner' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                    example.level === 'Advanced' ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' :
                    'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  } border`}>
                    {example.level}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-sky-300">{example.title}</h3>
                  <p className="text-slate-300 text-sm mb-4">{example.description}</p>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-600/30 mb-4">
                    <pre className="text-xs text-slate-300 overflow-x-auto">
                      <code>{example.code}</code>
                    </pre>
                  </div>
                  <Link
                    href={example.href}
                    className="inline-flex items-center text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                    prefetch={false}
                  >
                    View Complete Guide →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-slate-800/70">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Ready to Build Professional APIs?</h2>
              <p className="mt-4 text-lg text-slate-300">
                Join thousands of developers who&apos;ve mastered FastAPI using our progressive, 
                analogy-driven approach. From your first endpoint to enterprise microservices.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/docs/01_getting-started"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-sky-500 px-8 text-lg font-semibold text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700"
                  prefetch={false}
                >
                  🚀 Start Learning Now
                </Link>
                <Link
                  href="/docs/01_getting-started/your-first-api"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-slate-600 bg-transparent px-8 text-lg font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
                  prefetch={false}
                >
                  🍽️ Build Your First API
                </Link>
              </div>
              <p className="mt-6 text-sm text-slate-400">
                💡 <strong>Pro Tip:</strong> Start with our Getting Started guide and follow the progressive learning path. 
                Each section builds on the previous, but you can jump to specific topics as needed.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-slate-700 bg-slate-900">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} RESTful FastAPI Guidelines. Built with ❤️ for developers.</p>
          <div className="flex gap-4 mt-4 md:mt-0 items-center">
            <Link href="/docs" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Documentation
            </Link>
            <Link href="/docs/01_getting-started" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Get Started
            </Link>
            <Link href="/docs/04_advanced" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Enterprise Guide
            </Link>
            <Link
              href="https://github.com/ridwanspace/restful-fastapi-guideline"
              className="hover:text-sky-400 transition-colors flex items-center gap-2"
              prefetch={false}
              target="_blank"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              <span>GitHub</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}