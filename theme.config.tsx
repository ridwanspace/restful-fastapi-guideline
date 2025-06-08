import React from 'react'

const config = {
  useNextSeoProps() {
    return {
      titleTemplate: '%s – FastAPI Best Practices',
    }
  },
  logo: (
    <>
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
      <span style={{ marginLeft: '.4em', fontWeight: 800 }}>
        FastAPI Guide
      </span>
    </>
  ),
  project: {
    link: 'https://github.com/ridwanfathin/restful-fastapi-guideline',
  },
  docsRepositoryBase: 'https://github.com/ridwanfathin/restful-fastapi-guideline/tree/main',
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://fastapi.guide" target="_blank">
          FastAPI Best Practices
        </a>
        .
      </span>
    )
  },
  codeHighlight: true,
  defaultTheme: 'dark',
}

export default config