# Threads

With Intelligence running, CopilotKit threads are durable across reloads.

If threads are not persisting:
1. Ensure Docker services are healthy.
2. Ensure BFF can reach Intelligence endpoints.
3. Ensure frontend is using `/api/copilotkit` runtime URL.

Thread durability is complementary to the crypto canvas flow; canvas rendering should still work without historical thread restore.
