# Code Scanner Service

This service acts as an LLM to analyze code snippets and dependency files for potential security vulnerabilities and outdated packages using the Gemini API.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Gemini API key:
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    PORT=3000
    ```

3.  **Run the service:**
    ```bash
    npm start
    ```
    Or for development with auto-reloading:
    ```bash
    npm run dev
    ```

## API Endpoint

### `POST /scan`

Receives a JSON object with `code` and/or `dependencies` to be analyzed.

**Request Body:**

```json
{
  "code": "const user = req.query.user; // Unsafe user input",
  "dependencies": {
    "express": "^4.17.1",
    "lodash": "4.17.20"
  }
}
```

**Success Response (200 OK):**

```json
{
  "analysis": "The code snippet shows a potential security vulnerability..."
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Please provide code or dependencies to scan."
}
```

## Docker

To build and run this service as a Docker container:

1.  **Build the image:**
    ```bash
    docker build -t code-scanner-service .
    ```

2.  **Run the container:**
    Make sure to pass the `GEMINI_API_KEY` as an environment variable.
    ```bash
    docker run -p 3000:3000 -e GEMINI_API_KEY=YOUR_API_KEY code-scanner-service
    ```
