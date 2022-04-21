import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayRequestAuthorizerHandler } from "aws-lambda";

export class APIGatewayProxyHttpHelper {

    /**
    * Parses HTTP GET and POST data for the specified key
    * @req APIGatewayProxyEvent
    * @key string to search for
    * @returns string value, undefined if not found
    */
    static ValueFromRequest(req: APIGatewayProxyEvent, key: string): string {
        if (req?.queryStringParameters && (key in req?.queryStringParameters)) {
            return req.queryStringParameters?.[key] ?? "";
        } else if (req?.body) {
            var body = JSON.parse(req.body);
            if (key in body) {
                return body?.[key] ?? "";
            }
        }
        return "";
    };

    /**
    * Parses HTTP Header and returns a list of cookies
    * @headers APIGatewayProxyEventHeaders
    * @returns list of cookies found
    */
    static CookiesFromHeaders(headers: APIGatewayProxyEventHeaders) {
        if (headers?.Cookie === undefined) { return {}; }
        let list = {},
            rc = headers.Cookie;

        rc && rc.split(';').forEach(function (cookie) {
            let parts = cookie.split('=');
            let key = (parts as any)?.shift().trim();
            let value = decodeURI(parts.join('='));
            if (key != '') {
                (list as any)[key] = value;
            }
        });
        return list;
    };

    /**
    * Parses HTTP Headers cookies for the specified key
    * @headers APIGatewayProxyEventHeaders
    * @key string to search for
    * @returns string value, undefined if not found
    */
    static ValueFromCookies(headers: APIGatewayProxyEventHeaders, key: string): string {
        if (headers?.Cookie === undefined) { return ""; }
        let rc = headers.Cookie;

        rc && rc.split(';').forEach(function (cookie) {
            let parts = cookie.split('=');
            let ckey = (parts as any)?.shift().trim();
            let value = decodeURI(parts.join('='));
            if (ckey = key) {
                return value;
            }
        });
        return "";
    };
};