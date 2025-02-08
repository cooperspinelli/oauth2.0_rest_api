# OAuth 2.0 REST API with Express & TypeScript

This repository implements a simple **OAuth 2.0 Authorization Server** using **Express** and **TypeScript**, supporting:
- **Authorization Code Grant** (`/api/oauth/authorize`)
- **Token Exchange** (`/api/oauth/token`)
- **Refresh Token Flow**
- **JWT-based Access Tokens** using `jose`

## 🚀 Features
✅ TypeScript for type safety  
✅ Uses `jose` for secure JWT generation  
✅ Supports **authorization code flow** and **refresh tokens**  
✅ Secure **environment variable management** via `.env`  
✅ Fully **testable** with `Jest` + `Supertest`  

---

## 📂 Project Structure

```
repo-root/
├── src/
│   ├── app.ts               # Express app configuration
│   ├── config.ts            # Environment variables & configuration
│   ├── tokens.ts            # JWT token generation logic
│   └── index.ts             # Server entry point
├── __test__/                 # Unit & integration tests
│   ├── oauth.test.ts         # Jest tests for OAuth flows
├── .env                      # Environment variables (ignored in git)
├── .gitignore                # Ignores node_modules, .env, etc.
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # You are here 🚀
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/cooperspinelli/oauth2_rest_api.git
cd oauth2_rest_api
```

### 2️⃣ Install Dependencies
```sh
npm install
```

### 3️⃣ Create a `.env` File
Create a **.env** file in the root directory:

```
PORT=8080
CLIENT_ID=upfirst
REDIRECT_URI=http://localhost:8081/process
JWT_SECRET=my-super-secret-key
```

### 4️⃣ Run the Server
```sh
npm run
```

The server should start at `http://localhost:8080`.

---

## 🔥 API Endpoints

### 1️⃣ **OAuth Authorization Endpoint**  
**Request:**
```http
GET /api/oauth/authorize?response_type=code&client_id=upfirst&redirect_uri=http://localhost:8081/process&state=some_state
```
**Response:**
Redirects to:

```plaintext
http://localhost:8081/process?code=abcd1234&state=random_state
```

### 2️⃣ **Token Exchange (Authorization Code Grant)**  
**Request:**
```http
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "abcd1234",
  "client_id": "upfirst",
  "redirect_uri": "http://localhost:8081/process"
}
```
**Response:**
```json
{
  "access_token": "SOME_JWT_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "SOME_REFRESH_TOKEN"
}
```

### 3️⃣ **Refresh Token Flow**  
**Request:**
```http
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "client_id": "upfirst",
  "redirect_uri": "http://localhost:8081/process"
  "refresh_token": "SOME_REFRESH_TOKEN"
}
```
**Response:**
```json
{
  "access_token": "SOME_NEW_JWT_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "SOME_NEW_REFRESH_TOKEN"
}
```

---

## 🧪 Running Tests

To run the test suite:
```sh
npm test
```
This will execute all tests in `__test__/oauth.test.ts` using `Jest` and `Supertest`.


