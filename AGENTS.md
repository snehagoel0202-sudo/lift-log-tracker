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

## Rules
- User data is hide-only (deleted_at) everywhere, except account deletion: `deleteMyAccount` calls the service-role-only SQL function `delete_account_permanently`, which hard-deletes the caller's rows and auth user in one transaction. Why: a self-service deletion must be complete and atomic; don't convert it to a soft delete.
