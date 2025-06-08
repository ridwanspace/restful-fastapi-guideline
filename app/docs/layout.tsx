import { Layout } from 'nextra-theme-docs'
import { Banner } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
 
export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
}
 
// const banner = <Banner storageKey="some-key">Nextra 4.0 is released 🎉</Banner>
 
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Layout
        // banner={banner}
        pageMap={await getPageMap()}
        docsRepositoryBase="https://github.com/ridwanspace/restful-fastapi-guideline/tree/main"
      >
        {children}
      </Layout>
    </>
  )
}