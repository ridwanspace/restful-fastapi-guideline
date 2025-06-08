# Source Materials

This directory contains the original source materials used as a reference to build, modify, update, and edit the project, particularly when using LLMs or code assistants. It serves as the foundational layer for the entire documentation project, ensuring consistency, traceability, and a clear history of the content's evolution.

## Core Philosophy

The guiding principle behind this structure is to maintain a **single source of truth**. All documentation in the `app/docs` directory is generated from the materials within this `sources` directory. This approach ensures that:

- **Consistency**: All documentation is derived from a central, controlled set of files.
- **Traceability**: We can track how the documentation was generated, from the raw notes to the final output.
- **Scalability**: Updates and additions are made to the source files, which can then be used to regenerate the documentation, making maintenance more efficient.

## Directory Structure and Workflow

The documentation is generated through a multi-stage process, with each file and directory in `sources` playing a specific role.

### 1. Raw Materials: `fastapi_guidelines/`

This directory contains the raw, granular markdown files that represent the earliest versions of the documentation content. These are often unrefined notes, outlines, and specific guidelines that serve as the initial building blocks.

- **`*_fastapi_guideline.md`**: These files contain the foundational knowledge for different sections of the documentation (e.g., `beginner`, `intermediate`, `advanced`).
- **`refine_prompt*.md`**: These files contain specific prompts used to refine and structure the raw content within this directory.

### 2. Canonical Source: `restful_api_guidelines_with_fastapi.md`

This file is the **core knowledge base** for the project. It is a consolidated and refined version of the information from the `fastapi_guidelines/` directory. Before generating the final documentation, the content in this file is reviewed and polished to serve as the "single source of truth" for the technical guidelines.

### 3. Generation Instructions: `prompt.md`

This file contains the master prompts and instructions used to guide Large Language Models (LLMs). The LLM is instructed to use the content from `restful_api_guidelines_with_fastapi.md` to generate, refine, and structure the final documentation pages found in `app/docs`. This file provides a history of the instructions given to the AI, which is crucial for:

- Understanding how the current documentation was built.
- Creating new, consistent prompts for future updates.
- Debugging and refining the generation process.

## How to Update the Documentation

To contribute or make updates, always start with the files in this `sources` directory. **Do not edit the files in `app/docs` directly**, as they will be overwritten.

1.  **For Content Changes**:
    - If you are adding a new concept or making a small change, edit the most relevant file in the `fastapi_guidelines/` directory.
    - For larger, structural changes or refinements, update the `restful_api_guidelines_with_fastapi.md` file. Ensure it remains the canonical source.

2.  **For Generation/Structural Changes**:
    - If you want to change how the documentation is structured, formatted, or presented, modify the instructions in `prompt.md`.

3.  **Regenerate the Documentation**:
    - After making your changes to the source files, the next step is to run the LLM-based generation process to update the final documentation in `app/docs`. (Note: The specific script or command for this process should be documented here).

By following this workflow, we maintain a clear and transparent record of the source materials and the instructions used to develop the project, ensuring a solid foundation for future work.