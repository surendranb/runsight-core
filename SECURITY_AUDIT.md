# Security Audit Report: runsight-core

**Date:** August 21, 2025
**Auditor:** Gemini Security Research

## 1. Executive Summary

This security audit of the `runsight-core` codebase was conducted with a user-centric mindset, focusing on the risks to an everyday, tech-savvy runner who deploys this application for personal use.

The audit has uncovered **multiple critical and high-priority vulnerabilities**. The most severe issue is a **systemic and complete lack of authentication** across all backend serverless functions. This fundamental flaw exposes all user data and functionality to the public internet, allowing for data theft, data corruption, and financial abuse through denial-of-wallet attacks.

Other critical issues include a textbook Cross-Site Request Forgery (CSRF) vulnerability in the Strava authentication flow, and modern, AI-specific vulnerabilities like Prompt Injection.

**It is my professional opinion that the application, in its current state, is not safe for users to deploy.** The following findings must be addressed before any user is encouraged to use this software.

---

## 2. Vulnerability Findings

Vulnerabilities are listed in order of severity, from most to least critical.

### 2.1. Critical Vulnerabilities

#### CVE-2025-001: Missing Authentication on All Serverless Functions

*   **Severity:** **CRITICAL**
*   **Affected Files:** `sync-data.js`, `get-runs.js`, `ai-coach.js`, `update-user-physiology.mjs`, `get-user-physiology.mjs`
*   **Description:** None of the serverless functions verify the identity of the caller. They are all publicly accessible endpoints. Functions that require a user ID rely on an ID passed directly in the request body or query string, which is a severe Insecure Direct Object Reference (IDOR) vulnerability.
*   **Impact:**
    *   **Data Theft:** An attacker can call `get-runs.js` and `get-user-physiology.mjs` to steal the entire dataset of any user, including sensitive personal and location data.
    *   **Data Corruption:** An attacker can call `update-user-physiology.mjs` to maliciously overwrite or delete any user's data.
    *   **Denial of Wallet / Service Abuse:** An attacker can call `sync-data.js` and `ai-coach.js` repeatedly to trigger expensive API calls to Strava, OpenWeatherMap, and Google AI, resulting in significant financial cost to the user.
*   **Recommendation:**
    1.  **Implement Authentication Immediately:** All serverless functions must be protected. Use Netlify's Identity service to secure your functions. The frontend application should send a JWT in the `Authorization` header with every request.
    2.  **Verify Identity from Context:** Inside each function, get the user's identity from the `context.clientContext.user` object. **Do not trust the `userId` from the request body or query string.**
    3.  **Scope Database Queries:** All database queries must be scoped to the authenticated user's ID. For example: `supabase.from('runs').select('*').eq('user_id', context.clientContext.user.id)`.

---

### 2.2. High-Priority Vulnerabilities

#### CVE-2025-002: Cross-Site Request Forgery (CSRF) in Strava OAuth Flow

*   **Severity:** **HIGH**
*   **Affected File:** `auth-strava.js`
*   **Description:** The OAuth 2.0 authorization flow is missing the `state` parameter. This parameter is a standard security measure to prevent an attacker from tricking a user into authenticating the attacker's account.
*   **Impact:** An attacker could potentially link their own Strava account to the user's application instance, or cause other authentication-related mix-ups.
*   **Recommendation:**
    1.  When generating the Strava authorization URL, create a cryptographically random, unguessable string to use as the `state` parameter.
    2.  Store this `state` value securely on the server-side, associated with the user's session (e.g., in an HttpOnly cookie).
    3.  When handling the callback from Strava, verify that the `state` parameter returned by Strava matches the value you stored. If they do not match, abort the authentication attempt.

#### CVE-2025-003: Insecure Naming Convention for Server-Side Secrets

*   **Severity:** **HIGH**
*   **Affected Files:** `auth-strava.js`, `sync-data.js`, `get-runs.js`, `update-user-physiology.mjs`, `get-user-physiology.mjs`
*   **Description:** Highly sensitive, server-only secrets (e.g., `STRAVA_CLIENT_SECRET`, `OPENWEATHER_API_KEY`) are loaded from environment variables prefixed with `VITE_`. In a Vite project, any variable with this prefix can be accidentally bundled and exposed to the client-side code.
*   **Impact:** This practice creates a high risk of leaking server-side secrets to the browser, which would be a total compromise of the connected services.
*   **Recommendation:**
    1.  **Immediately rename all environment variables for server-side secrets.** Remove the `VITE_` prefix. For example, `VITE_STRAVA_CLIENT_SECRET` should become `STRAVA_CLIENT_SECRET`.
    2.  Update the function code to use the new, correctly named environment variables.
    3.  Establish a strict convention: the `VITE_` prefix is **only** for non-sensitive configuration that is explicitly intended to be public in the browser.

#### CVE-2025-004: Prompt Injection in AI Function

*   **Severity:** **HIGH**
*   **Affected File:** `ai-coach.js`
*   **Description:** The function directly embeds raw user input into the prompts sent to the Google AI model.
*   **Impact:** An attacker can craft malicious input to hijack the behavior of the AI model, causing it to ignore its intended purpose and perform other tasks. This leads to service abuse and can generate unexpected costs.
*   **Recommendation:**
    1.  **Separate Instructions from Data:** Clearly demarcate instructions from user-provided data within your prompts. For example, use XML tags or JSON structures.
    2.  **Add a System Prompt:** Instruct the model that it should never obey instructions found in the user data section.
    3.  **Sanitize Input:** Before embedding user data, sanitize it to remove or escape language that could be interpreted as instructions.

#### CVE-2025-005: Mass Assignment Vulnerability

*   **Severity:** **HIGH**
*   **Affected File:** `update-user-physiology.mjs`
*   **Description:** The function uses the JavaScript spread operator (`...physiologyData`) to pass the entire request body directly into the database `update` query.
*   **Impact:** An attacker could add extra fields to the request body to modify columns in the database that they are not supposed to have access to (e.g., an `is_admin` flag, a `user_id`, etc.).
*   **Recommendation:**
    1.  **Never trust the shape of client-side data.**
    2.  Instead of using a spread operator, create a new object and explicitly map only the allowed and expected fields from the request body to the `update` query. Ignore all other fields.

#### CVE-2025-006: Ineffective Content Security Policy (CSP)

*   **Severity:** **HIGH**
*   **Affected File:** `netlify.toml`
*   **Description:** The CSP uses `'unsafe-inline'` for scripts, which largely negates its ability to protect against Cross-Site Scripting (XSS) attacks.
*   **Impact:** The application is vulnerable to XSS if an attacker can find any way to inject content into the page.
*   **Recommendation:**
    1.  **Remove `'unsafe-inline'`**.
    2.  Configure your Vite build process to use a modern CSP approach, such as generating hashes or nonces for all scripts. This is a standard feature in modern web development tooling.
    3.  Strengthen the other directives, such as `connect-src`, to only allow connections to your Netlify functions and Supabase URL.

---

### 2.3. Medium & Low Priority Findings

*   **Deprecated Dependency (`@google/generative-ai`):** (Medium) The Google AI SDK is deprecated and will stop receiving support and security patches. This should be migrated to the new SDK to ensure long-term security.
*   **Excessive Data Exposure (`get-runs.js`):** (Medium) The API returns the entire raw `strava_data` object. The API should be refactored to only return the data fields that are strictly necessary for the frontend to function.
*   **Unused Dependency (`node-fetch`):** (Low) The `node-fetch` package is listed as a dependency but is not used. It should be removed to improve code hygiene.
*   **Permissive CORS Policy:** (Low) The CORS policy on all functions is set to `*`. It should be restricted to the application's specific domain.

## 3. Conclusion

The `runsight-core` application is built on a modern technology stack, but it suffers from fundamental security design flaws, most notably in its complete lack of authentication. The recommendations in this report, especially the implementation of authentication, are critical to ensuring the safety and privacy of your users.
