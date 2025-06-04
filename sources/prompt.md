## Create new
please split sections at
@sources/fastapi_guidelines/intermediate_fastapi_guidelines.md into dedicated subfolder/page.mdx into @app/docs/03_intermediate , make sure the subfolder names are in correct order since the order is defined by the subfolder name, follow the orders based on sections at @sources/fastapi_guidelines/intermediate_fastapi_guidelines.md , do
not change any contents there, keep the original, as reference, you can view @app/docs/02_foundation/

please split sections at @sources/fastapi_guidelines/advanced_fastapi_guidelines.md into dedicated subfolder/page.mdx into @app/docs/04_advance containing each page.mdx , make sure the subfolder names are in correct order since the order is defined by the subfolder name, follow the orders based on sections at @sources/fastapi_guidelines/advanced_fastapi_guidelines.md , do not change any contents there (keep the original). As reference, you can view @app/docs/02_foundation/ folder

## Refine
### New
please review the content (each page.mdx) under @app/docs/02_foundation/ and @app/docs/03_intermediate/

after you get the context, your mission is to refine, modify, extend the content (each page.mdx) under:
- @app/docs/04_advance/01/page.mdx
- @app/docs/04_advance/02/page.mdx
- @app/docs/04_advance/03/page.mdx

the purpose of refinement is to avoid the duplicate/overlap content of three page.mdx above compared to its predecessors (02_foundation and 03_intermediate), make sure you also:
- refine and correct the content (if any wrong you've found)
- extend or include intermediate topics/content
- include emoji, mermaid diagram, analogy to explain the complex concept with easy
- add more information/theory/concept before and after the snippet, since it is advanced topics we need to read necessary information to grasp the concept cleary, but always make the explanation simplified
- add comments into the signinficant line of code
- enable user to have smooth transitioned from 02_foundation and 03_intermediate
  
when refining the page.tsx, please follow this conditions:
- if we have found the same contents from previous ones, please refine it with advanced topics but do not repeat/duplicate the same contents
- if we have'nt found the same contents from previous ones, please keep the current contens then add more advanced topics below it, do not remove the current content



### Gradual
please review the content (each page.mdx) under @app/docs/01_getting-started/ and @app/docs/02_foundation/ , include to get context of
- @app/docs/03_intermediate/01-uri-design/page.mdx,
- @app/docs/03_intermediate/02-http-methods/page.mdx,
- @app/docs/03_intermediate/03-api-versioning/page.mdx ,
- @app/docs/03_intermediate/04-request-format/page.mdx ,
- @app/docs/03_intermediate/05-response-format/page.mdx ,

after you get the context, please refine, modify, extend the content (each page.mdx) under:
- @app/docs/03_intermediate/06-http-status-codes/,
- @app/docs/03_intermediate/07-error-handling/ ,

the purpose is to avoid the duplicate/overlap content @app/docs/03_intermediate/ number 06 and 07 compared to its predecessors (01 and 02), make sure you also:
- refine and correct the content (if any wrong you've found)
- extend or include intermediate topics/content
- include emoji, mermaid diagram, analogy to explain the complex concept with easy

when refining the page.tsx, please follow this conditions:
- if we have found the same contents from previous ones, please refine it with advanced topics but do not repeat/duplicate the same contents
- if we have'nt found the same contents from previous ones, please keep the current contens then add more advanced topics below it, do not remove the current content

enable user to have smooth transitioned from 02 and 03 topics