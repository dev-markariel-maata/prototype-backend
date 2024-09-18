import dotenv from 'dotenv';

dotenv.config();

export const AUTH_COOKIE_NAME = "aut";
export const OAUTH_STATE_COOKIE_NAME = "oas";
export const OAUTH_CODE_VERIFIER_COOKIE_NAME = "ocv";

export function getAuthorizationUrl(
    redirectUri: string,
    state: string,
    codeChallenge: string,
): string {
    const scopes = [
        'design:content:read',
        'design:meta:read',
        'design:content:write',
        'asset:read',
        'brandtemplate:meta:read',
        'brandtemplate:content:read',
        'profile:read'
    ]
    const scopeString = scopes.join(" ");

    const clientId = process.env.CANVA_CLIENT_ID
    if (!clientId) {
      throw new Error("'CANVA_CLIENT_ID' env variable not found.");
    }

    const url = new URL(`https://www.canva.com/api/oauth/authorize`)
    url.searchParams.append("code_challenge", codeChallenge);
    url.searchParams.append("code_challenge_method", "S256");
    url.searchParams.append("scope", scopeString);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("state", state);

    return url.toString();
}