# Authelia — client OIDC pour mangetout

⚠️ La config OIDC vit dans **ta** config Authelia (`configuration.yml`), pas dans ce dépôt.
Ce dossier n'est qu'une **référence**. Aucun secret ici (le hash ci-dessous est un exemple).

Hypothèse : ton Authelia est sur `https://auth.vindiesel.vip` (ajuste si différent).
PocketBase est sur `https://pb.vindiesel.vip`.

## 1. Générer le secret client (plaintext + hash)
```bash
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate pbkdf2 --variant sha512 \
  --random --random.length 72 --random.charset rfc3986
```
Sortie :
- `Random Password: …` → **le plaintext**, à mettre côté **PocketBase** (champ Client secret) et dans `infra/.env` (`OIDC_CLIENT_SECRET`).
- `Digest: $pbkdf2-sha512$…` → **le hash**, à mettre dans la config Authelia ci-dessous.

## 2. (Seulement si l'OIDC n'est pas déjà activé chez toi) prérequis provider
Si tu utilises déjà d'autres apps OIDC via Authelia, saute cette étape.
```bash
# HMAC secret
docker run --rm authelia/authelia:latest authelia crypto rand --length 64 --charset alphanumeric
# Clé de signature RSA (JWKS)
docker run --rm -v "$PWD:/keys" authelia/authelia:latest \
  authelia crypto pair rsa generate --directory /keys   # -> private.pem / public.pem
```
```yaml
identity_providers:
  oidc:
    hmac_secret: '<sortie crypto rand>'
    jwks:
      - key: {{ secret "/config/keys/private.pem" | nindent 10 }}   # ou chemin monté
    clients:
      - # (voir étape 3)
```

## 3. Déclarer le client `mangetout`
```yaml
identity_providers:
  oidc:
    clients:
      - client_id: 'mangetout'
        client_name: 'mangetout'
        client_secret: '$pbkdf2-sha512$310000$...<TON HASH étape 1>...'
        public: false
        authorization_policy: 'two_factor'   # ou 'one_factor' si tu n'utilises pas la 2FA
        redirect_uris:
          - 'https://pb.vindiesel.vip/api/oauth2-redirect'
        scopes:
          - 'openid'
          - 'email'
          - 'profile'
        response_types:
          - 'code'
        grant_types:
          - 'authorization_code'
        token_endpoint_auth_method: 'client_secret_basic'
        require_pkce: true
        pkce_challenge_method: 'S256'
```
Puis **redémarre Authelia** (`docker compose restart authelia`) et vérifie les logs.

## 4. Côté PocketBase (UI admin → Settings → Auth providers → OIDC générique)
Récupère les endpoints exacts sur `https://auth.vindiesel.vip/.well-known/openid-configuration` :
- **Client ID** : `mangetout`
- **Client secret** : le *plaintext* de l'étape 1
- **Auth URL** : `https://auth.vindiesel.vip/api/oidc/authorization`
- **Token URL** : `https://auth.vindiesel.vip/api/oidc/token`
- **User info URL** : `https://auth.vindiesel.vip/api/oidc/userinfo`
- (Issuer/discovery) : `https://auth.vindiesel.vip`

Relève le **nom exact** du provider tel qu'affiché par PocketBase → à reporter dans
`app/eas.json` (`EXPO_PUBLIC_OIDC_PROVIDER`, défaut `oidc`).

## ⚠️ Gotcha à vérifier au 1er login
Si l'échange de jeton échoue, bascule `token_endpoint_auth_method` entre
`client_secret_basic` et `client_secret_post` pour matcher ce que PocketBase envoie.
