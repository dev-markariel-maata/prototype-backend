import axios from "axios";
import { getToken, updateToken } from "./queries/users";
import * as jose from "jose";

export async function getAccessTokenForUser(id: string): Promise<string> {
    const storedToken =  await getToken(id)
    if (!storedToken) {
      throw new Error("No token found for user");
    }

    const claims = jose.decodeJwt(storedToken.access_token);
    const refreshBufferSeconds = 60 * 10; // 10 minutes;
    if (claims.exp) {
      const aBitBeforeExpirationSeconds = claims.exp - refreshBufferSeconds;
      const nowSeconds = Date.now() / 1000;
      if (nowSeconds < aBitBeforeExpirationSeconds) {
        return storedToken.access_token;
      }
    }

    // Otherwise, we need to refresh the token
    const refreshToken = storedToken.refresh_token;

    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });
    const credentials = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');

    const result = await axios.post('https://api.canva.com/rest/v1/oauth/token', 
        params, 
        {
            headers: {
            "Authorization": `Basic ${credentials}`, 
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (!result) {
        throw new Error(`Failed to refresh token ${result}`);
    }
    if (!result.data) {
        throw new Error(
            "No data returned when exchanging oauth code for token, but no error was returned either.",
        );
    }

    const refreshedToken = result.data;
    
    await updateToken(refreshedToken, id);

    return refreshedToken.access_token;
}