import type { Context } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { StatusCodes } from 'http-status-codes'

interface RateLimiterConfig {
    windowMs: number
    limit: number
    standardHeaders: boolean
    keyGenerator: (c: Context) => string
}

// Get client IP address
const getClientIp = (c: Context): string => {
    // Check for forwarded IP (if behind proxy/nginx)
    const forwardedFor = c.req.header('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    // Check for real IP header
    const realIp = c.req.header('x-real-ip')
    if (realIp) {
        return realIp
    }

    // Fallback to connection remote address
    return 'unknown'
}

// General API rate limiter - 100 requests per 15 minutes
export const generalRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7', // Return rate limit info in headers
    keyGenerator: (c) => getClientIp(c),
    handler: (c) => {
        return c.json(
            {
                error: 'Too many requests',
                message: 'You have exceeded the rate limit. Please try again later.',
                retryAfter: `${c.res.headers.get('Retry-After')} seconds`,
            },
            StatusCodes.TOO_MANY_REQUESTS
        )
    },
})

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
export const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 login/register attempts per window
    standardHeaders: 'draft-7',
    keyGenerator: (c) => getClientIp(c),
    handler: (c) => {
        return c.json(
            {
                error: 'Too many authentication attempts',
                message: 'You have exceeded the authentication rate limit. Please try again after 15 minutes.',
                retryAfter: `${c.res.headers.get('Retry-After')} seconds`,
            },
            StatusCodes.TOO_MANY_REQUESTS
        )
    },
})

// Moderate rate limiter for sensitive operations - 30 requests per 15 minutes
export const moderateRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    keyGenerator: (c) => getClientIp(c),
    handler: (c) => {
        return c.json(
            {
                error: 'Too many requests',
                message: 'You have exceeded the rate limit for this operation.',
                retryAfter: `${c.res.headers.get('Retry-After')} seconds`,
            },
            StatusCodes.TOO_MANY_REQUESTS
        )
    },
})
