CONTENTCRAFT — FINAL REAL API VERIFICATION

The Gemini 404 handling has been improved, but the previous report only tested an INVALID API key.

Do NOT make any UI redesign.
Do NOT change API-key storage.
Do NOT modify unrelated functionality.

IMPORTANT:
We now need to prove that ContentCraft works with a REAL VALID Gemini API key.

Before making changes, inspect the current implementation.

CURRENT IMPLEMENTATION:
- custom-routes.ts was modified.
- Gemini REST endpoint is:
  https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
- x-goog-api-key header is used.
- The application probes models and caches the working model.

==================================================
TASK 1 — UPDATE THE MODEL PRIORITY LIST
==================================================

The current Google Gemini API has these active stable text models:

1. gemini-3.8-flash
2. gemini-3.7-flash
3. gemini-3.6-flash
4. gemini-3.5-flash
5. gemini-3.5-flash-lite
6. gemini-3.1-flash-lite

Use these current models for probing.

Remove these obsolete/shut-down models from the probing list:

- gemini-2.0-flash
- gemini-2.0-flash-lite
- gemini-2.0-flash-exp
- gemini-1.5-flash
- gemini-1.5-flash-8b
- gemini-1.5-pro
- gemini-pro

Do NOT probe shut-down models.

Do NOT use image-only, TTS, embedding, or video models.

==================================================
TASK 2 — KEEP THE EXISTING REST API
==================================================

Do not rewrite the whole Gemini integration unless necessary.

The generateContent request should remain compatible with:

POST
https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent

Header:
x-goog-api-key: USER_API_KEY

Minimal body:

{
  "contents": [
    {
      "parts": [
        {
          "text": "Reply with exactly: CONNECTION_OK"
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 5
  }
}

==================================================
TASK 3 — TEST WITH THE ACTUAL VALID USER KEY
==================================================

I will enter a REAL VALID Gemini API key in the ContentCraft Settings page.

Test exactly:

1. Save key
2. Refresh Settings
3. Confirm:
   activeSource = user
   hasUserKey = true

4. Click Test Connection

Expected result:

SUCCESS

Example:

"Connected successfully — Gemini 3.8 Flash"

or whichever current model actually succeeds.

Do NOT report success merely because the key was saved.

The test must actually call Gemini generateContent and receive a successful response.

==================================================
TASK 4 — TEST REAL CONTENT GENERATION
==================================================

After Test Connection succeeds:

Use the AI Writer.

Generate a simple article:

"Write a short 100-word article about the benefits of learning artificial intelligence."

Verify that:

- response comes from Gemini
- response is not demo/template content
- no 404 occurs
- no authentication error occurs
- no API key appears in frontend/network response payloads
- selected working model is used

==================================================
TASK 5 — TEST OTHER FEATURES
==================================================

After AI Writer works, test:

1. LinkedIn
2. Rewrite
3. SEO Writer
4. YouTube

Each should use the same working Gemini model unless the feature intentionally requires another model.

Do NOT introduce separate hardcoded obsolete models.

==================================================
TASK 6 — INVALID KEY TEST
==================================================

After successful real-key testing:

Replace the key with an intentionally invalid key.

Click Test Connection.

Expected:

Clear authentication error.

NOT:

- successful connection
- demo content
- generic 404

==================================================
TASK 7 — REMOVE KEY TEST
==================================================

Click Remove Key.

Expected:

activeSource = none
hasUserKey = false

Then Generate.

Expected:

demo/fallback mode works.

==================================================
TASK 8 — IMPORTANT ERROR CLASSIFICATION
==================================================

Use the actual Gemini response body when determining the error.

Google distinguishes:

401 = authentication
403 = permission denied
404 = resource/model not found
429 = rate limit/quota

Do not classify every 404 as "invalid API key".

If HTTP 404 occurs, inspect the returned error body and determine whether it is:

model_not_found

or

not_found

Then display the appropriate message.

==================================================
TASK 9 — SECURITY
==================================================

Verify:

- API key never returned by /settings/status
- API key never returned by /settings/test
- API key never returned by /generate
- API key never stored in localStorage
- API key never stored in cookies
- API key never logged
- API key never exposed to frontend JavaScript

Only:

hasUserKey: true/false

may be returned.

==================================================
FINAL REPORT
==================================================

Do NOT give me another theoretical report.

Give me an ACTUAL verification report containing:

1. Valid key test: PASS/FAIL
2. Test Connection: PASS/FAIL
3. Actual working Gemini model
4. Actual Gemini HTTP status
5. AI Writer generation: PASS/FAIL
6. LinkedIn generation: PASS/FAIL
7. Rewrite: PASS/FAIL
8. SEO Writer: PASS/FAIL
9. YouTube: PASS/FAIL
10. Invalid key handling: PASS/FAIL
11. Remove key: PASS/FAIL
12. Demo mode: PASS/FAIL
13. API key security: PASS/FAIL

If the REAL valid key test cannot be performed automatically because the key must be entered manually in the UI, explicitly say:

"READY FOR MANUAL VALID-KEY TEST"

and stop making speculative changes.