import express, { CookieOptions } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { AUTH_COOKIE_NAME, getAuthorizationUrl, OAUTH_CODE_VERIFIER_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from "../services/auth";
import * as jose from "jose";
import { deleteToken, getToken, setToken } from "../services/queries/users";
import { getAccessTokenForUser } from "../services/client";

const router = express.Router()
dotenv.config();

const globals: {
    redirectUri: string;
} = {
    redirectUri: "",
};
  
const endpoints = {
    REDIRECT: "/oauth/redirect",
    SUCCESS: "/success",
    FAILURE: "/failure",
    AUTHORIZE: "/authorize",
    IS_AUTHORIZED: "/isauthorized",
    REVOKE: "/revoke",
};

globals.redirectUri = new URL(
    endpoints.REDIRECT,
    process.env.CANVA_BACKEND_HOST,
).toString();

// Step 1: Initiate OAuth flow
router.get(endpoints.AUTHORIZE, (req, res) => {
    const codeVerifier = crypto.randomBytes(96).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    const state = crypto.randomBytes(96).toString("base64url");

    const url = getAuthorizationUrl(globals.redirectUri, state, codeChallenge)

    const cookieConfiguration: CookieOptions = {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 20, // 20 minutes
        sameSite: "lax", // since we will be redirecting back from Canva, we need the cookies to be sent with every request to our domain
        secure: process.env.NODE_ENV === "production",
        signed: true,
    };

    return (
        res
          // By setting the state as a cookie, we bind it to the user agent.
          // https://portswigger.net/web-security/csrf/preventing
          // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
          .cookie(OAUTH_STATE_COOKIE_NAME, state, cookieConfiguration)
          // We set the code verifier as a cookie for convenience in this example.
          // It could also be stored in the database.
          .cookie(
            OAUTH_CODE_VERIFIER_COOKIE_NAME,
            codeVerifier,
            cookieConfiguration,
          )
          .redirect(url)
    );
});
  
// Step 2: Handle the OAuth redirect
router.get(endpoints.REDIRECT, async (req, res) => {
    const authorizationCode = req.query.code;
    const state = req.query.state;

    if (typeof authorizationCode !== "string" || typeof state !== "string") {
        const params = new URLSearchParams({
          error:
            typeof req.query.error === "string" ? req.query.error : "Unknown error",
        });
        return res.redirect(`${endpoints.FAILURE}?${params.toString()}`);
    }
    
    try {
        if(state != req.signedCookies[OAUTH_STATE_COOKIE_NAME]){
            throw new Error(
                `Invalid state ${state} != ${req.signedCookies[OAUTH_STATE_COOKIE_NAME]}`,
            );
        }
        
        const codeVerifier = req.signedCookies[OAUTH_CODE_VERIFIER_COOKIE_NAME];
        const credentials = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');

        const params = new URLSearchParams({
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
            code: authorizationCode,
            redirect_uri: globals.redirectUri,
        });

        const result = await axios.post('https://api.canva.com/rest/v1/oauth/token', 
            params, 
            {
                headers: {
                "Authorization": `Basic ${credentials}`, // Include Base64 encoded credentials
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        
        const token = result.data;
        if (!token) {
          throw new Error(
            "No token returned when exchanging oauth code for token, but no error was returned either.",
          );
        }

        const claims = jose.decodeJwt(token.access_token);
        const claimsSub = claims.sub;
        if (!claimsSub) {
          throw new Error("Unable to extract claims sub from access token.");
        }

        res.cookie(AUTH_COOKIE_NAME, claimsSub, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
            // SameSite default is "lax"; for cookies used for authentication it should be
            // "strict" but while in development "lax" is more convenient.
            // We can't use "none", even in development, because that requires Secure, which
            // requires https, which we don't want to set up for local development.
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            secure: process.env.NODE_ENV === "production",
            signed: true,
        });
        
        await setToken(token, claimsSub)

        return res.redirect(endpoints.SUCCESS);
    } catch (error) {
        console.error(error)
        const url = new URL(endpoints.FAILURE, process.env.CANVA_BACKEND_HOST)
        if(error instanceof Error){
            url.searchParams.append("error", error.message || error.toString())
        }
        return res.redirect(url.toString())
    }
});

router.get(endpoints.FAILURE, async (req, res) => {
    res.render("auth_failure", {
        countdownSecs: 10,
        message: "authorization_error",
        errorMessage: req.query.error || "Unknown error",
    });
});

router.get(endpoints.SUCCESS, async (req, res) => {
    res.render("auth_success", {
        countdownSecs: 2,
        message: "authorization_success",
    });
});

router.get(endpoints.IS_AUTHORIZED, async (req, res) => {
    const auth = req.signedCookies[AUTH_COOKIE_NAME];
    try {
        await getAccessTokenForUser(auth);
        return res.json({ status: true });
    } catch (error) {
        return res.sendStatus(404);
    }
});

router.get(endpoints.REVOKE, async(req, res) => {
  const user = req.signedCookies[AUTH_COOKIE_NAME];
  const token = await getToken(user);

  res.clearCookie(AUTH_COOKIE_NAME);
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const client_id = process.env.CANVA_CLIENT_ID;
    if (!client_id) {
      throw new Error("'CANVA_CLIENT_ID' env variable is undefined");
    }

    const client_secret = process.env.CANVA_CLIENT_SECRET;
    if (!client_secret) {
      throw new Error("'CANVA_CLIENT_SECRET' env variable is undefined");
    }

    const params = new URLSearchParams({
        client_secret,
        client_id,
        // Revoking the refresh token revokes the consent and the access token,
        // this is the way for Connect API clients to disconnect users.
        token: token.refresh_token,
    });

    const credentials = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');
    await axios.post('https://api.canva.com/rest/v1/oauth/revoke', 
        params, 
        {
            headers: {
            "Authorization": `Basic ${credentials}`, // Include Base64 encoded credentials
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    
    return res.json({ status: true });
  } catch (error) {
    console.log(error);
    return res.sendStatus(401);
  }finally{
    await deleteToken(user);
  }
})
  
export default router;