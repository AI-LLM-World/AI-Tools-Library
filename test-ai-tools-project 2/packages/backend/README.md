Backend - Submissions (Programmatic Basic Auth)

Configuration
- SUBMISSIONS_CLIENTS: JSON string mapping client_id -> client_secret. Example:

  export SUBMISSIONS_CLIENTS='{ "integration-1": "super-secret-abc", "partner-x": "another-secret" }'

Usage (programmatic submissions)
- Endpoint: POST /api/tools/submit
- Auth: Basic: base64(client_id:client_secret)
- Headers: X-Idempotency-Key (optional)
- Body: JSON { name: string, category?: string, short_description?: string, website?: https-url, tags?: string[] }

Example curl

  curl -X POST "http://localhost:4000/api/tools/submit" \
    -H "Authorization: Basic $(echo -n 'integration-1:super-secret-abc' | base64)" \
    -H "Content-Type: application/json" \
    -d '{"name":"My Tool","website":"https://example.com","short_description":"desc"}'

Notes
- Client secrets must be configured via env/secret manager. Do NOT commit secrets.
- Admin endpoints remain protected by SUBMISSIONS_ADMIN_KEY (x-admin-api-key header or Authorization: Bearer <key>).
