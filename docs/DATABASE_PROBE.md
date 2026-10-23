# Database persistence probe

`npm run db:probe` is an operator-only check that writes one identifiable synthetic Source, verifies it in a separate process, and deletes only that fixture. It is never part of normal build/start/test. Use the intended migrated database and Node 24.22.0/npm 11.19.1.

```sh
npm run db:probe -- --help
npm run db:probe -- write --manifest <absolute-private-file-outside-checkout>
npm run db:probe -- verify --manifest <same-file>
npm run db:probe -- cleanup --manifest <same-file>
```

Replace placeholders with a private absolute file path, never a connection string. The manifest contains private ownership/control data; do not commit, print, screenshot or paste its contents. Restrict its directory with POSIX mode 0700/file mode 0600, or the current Windows user's ACL. Keep a protected copy off the service's ephemeral disk before restarting it.

`write` exclusively creates the manifest before inserting. It refuses an existing file. `prepare` creates only a manifest, `validate` checks it without connecting, and `write-existing` inserts using an already-prepared manifest exactly once. The fixed TTL is two hours; verification never refreshes it. Do not create a new writer to disguise a failed persistence check.

For a restart check, write once, verify, restart the intended service, then verify with the same unchanged manifest. Cleanup checks ID, owner, run marker and timestamps before an atomic fixture-only deletion, including after expiry. Repeated cleanup returns ALREADY_ABSENT. It never sweeps tables or touches the caption cache. Retain the handle until cleanup is confirmed, then remove it securely.

Use provider-required certificate verification; never bypass TLS validation. Live modes read private `.env`/process configuration. Help/prepare/validate do not load credentials or connect. Success exits 0 after closing the connection; failures exit 1 with a sanitized category. Network/timeout failures around writes/deletes can have an uncertain outcome: keep the same handle and inspect via verify/cleanup rather than starting another write. [General cleanup](OPERATIONS.md#expired-data-cleanup) is a separate operation.
