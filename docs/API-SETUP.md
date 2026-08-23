# Burning Man API setup

1. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Name it `BURNING_MAN_API_KEY`.
3. Paste the newly regenerated Burning Man API key.
4. Do not commit the key to the repository.
5. Run **Actions → Import Burning Man API → Run workflow**.

The workflow fetches official 2026 Events, Camps, Art, and Mutant Vehicles and stores the returned data under `data/api/`.

**Security:** The API key shown in Dmitri's approval email screenshot must be considered exposed. Revoke/regenerate it before adding the replacement secret.
