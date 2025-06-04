import Link from 'next/link';

export default function LandingPage() {
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
            <span className="text-xl font-bold">AeroFlow</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="#features" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Features
            </Link>
            <Link href="#pricing" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Docs
            </Link>
            <Link href="#contact" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Contact
            </Link>
          </nav>
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700 disabled:pointer-events-none disabled:opacity-50"
            prefetch={false}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 lg:py-40 bg-gradient-to-b from-slate-800/50 to-transparent">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Build & Ship Faster with</span>
              <span className="block text-sky-400">AeroFlow Platform</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300 sm:text-xl md:text-2xl">
              The ultimate solution for modern development teams. Streamline your workflows, automate deployments, and scale with confidence.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex h-12 items-center justify-center rounded-md bg-sky-500 px-8 text-lg font-semibold text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700"
                prefetch={false}
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-600 bg-transparent px-8 text-lg font-semibold text-slate-100 shadow-sm transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
                prefetch={false}
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-24 bg-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Why AeroFlow?</h2>
              <p className="mt-4 text-lg text-slate-300">
                Discover the features that make AeroFlow the go-to platform for high-performance teams.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Blazing Fast CI/CD", description: "Automate your build, test, and deployment pipelines with unparalleled speed and reliability.", icon: "🚀" },
                { title: "Scalable Infrastructure", description: "Effortlessly scale your applications with our managed infrastructure, built for performance.", icon: "⚙️" },
                { title: "Developer-Friendly Tools", description: "Integrate seamlessly with your favorite tools and frameworks. Focus on code, not ops.", icon: "🛠️" },
                { title: "Advanced Analytics", description: "Gain deep insights into your application performance and user behavior.", icon: "📊" },
                { title: "Secure by Design", description: "Enterprise-grade security features to protect your data and applications.", icon: "🛡️" },
                { title: "Collaborative Workflows", description: "Enhance team productivity with built-in collaboration and version control.", icon: "🤝" },
              ].map((feature) => (
                <div key={feature.title} className="bg-slate-700/50 p-6 rounded-lg shadow-lg hover:shadow-sky-500/20 transition-shadow">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-sky-300">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </div>
              ))}</div>
          </div>
        </section>

        <section id="pricing" className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Simple, Transparent Pricing</h2>
              <p className="mt-4 text-lg text-slate-300">Choose the plan that's right for you. No hidden fees, ever.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {[
                { name: "Starter", price: "$0", features: ["1 Project", "Basic CI/CD", "Community Support"], popular: false },
                { name: "Pro", price: "$49", unit: "/month", features: ["Unlimited Projects", "Advanced CI/CD", "Priority Support", "Team Collaboration"], popular: true },
                { name: "Enterprise", price: "Custom", features: ["Dedicated Infrastructure", "SLA & Premium Support", "Custom Integrations"], popular: false },
              ].map((plan) => (
                <div key={plan.name} className={`relative flex flex-col p-6 bg-slate-800 rounded-lg shadow-xl border-2 ${plan.popular ? 'border-sky-500' : 'border-slate-700'}`}>
                  {plan.popular && (
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-sky-500 text-white">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-2xl font-semibold text-sky-300 mb-2">{plan.name}</h3>
                  <p className="text-4xl font-bold mb-1">{plan.price}<span className="text-sm font-normal text-slate-400">{plan.unit}</span></p>
                  <p className="text-slate-400 mb-6">{plan.name === "Enterprise" ? "Tailored for your needs" : "Per seat, billed annually"}</p>
                  <ul className="space-y-2 text-slate-300 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}</ul>
                  <Link
                    href="/auth/signup"
                    className={`mt-8 block w-full py-3 px-6 text-center rounded-md font-semibold transition-colors ${plan.popular ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'}`}
                    prefetch={false}
                  >
                    {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                  </Link>
                </div>
              ))}</div>
          </div>
        </section>

        <section id="contact" className="py-16 md:py-24 bg-slate-800/70">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-sky-400">Ready to Elevate Your Workflow?</h2>
              <p className="mt-4 text-lg text-slate-300">
                Join thousands of innovative teams building the future with AeroFlow.
                Have questions or need a custom solution? Get in touch!
              </p>
              <div className="mt-8">
                <Link
                  href="mailto:support@aeroflow.com"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-sky-500 px-8 text-lg font-semibold text-white shadow transition-colors hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700"
                  prefetch={false}
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-slate-700 bg-slate-900">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} AeroFlow Inc. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-sky-400 transition-colors" prefetch={false}>
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}