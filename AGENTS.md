<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All data access goes through server functions in src/lib/family.functions.ts using the service-role client; tables have RLS on with no public policies, so the browser never touches the DB directly.
- Admin auth is a shared-password gate (ADMIN_PASSWORD secret + encrypted session cookie via SESSION_SECRET); every admin server fn calls requireAdmin() first.
- Photos are stored as compressed JPEG data URLs in the row (workspace blocks public buckets).
- One vote per browser: random token in localStorage + UNIQUE(voter_token) in votes.
