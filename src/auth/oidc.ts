import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
} from 'oidc-client-ts'

const issuer = import.meta.env.VITE_OIDC_ISSUER
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID

if (!issuer || !clientId) {
  throw new Error('OIDC configuration is missing. Check your environment variables.')
}

export const oidcSettings = {
  authority: issuer,
  client_id: clientId,

  // Authorization Code flow with PKCE (enabled by default).
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',

  // Temporary login transaction state survives the Keycloak redirect.
  stateStore: new WebStorageStateStore({
    store: window.sessionStorage,
  }),

  // User object and tokens remain in memory, not browser storage.
  userStore: new WebStorageStateStore({
    store: new InMemoryWebStorage(),
  }),

  // We'll manage refresh centrally rather than enable background renewal here.
  automaticSilentRenew: false,
}

export const oidcUserManager = new UserManager(oidcSettings)
