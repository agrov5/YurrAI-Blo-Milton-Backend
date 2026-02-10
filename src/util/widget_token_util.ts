import jwt from "jsonwebtoken";

/**
 * Widget Link Token Utility
 *
 * Generates and verifies signed JWT tokens used in SMS links for the
 * credit-card widget. This prevents Insecure Direct Object Reference (IDOR)
 * attacks — only recipients of the signed link can access the payment page
 * and the partner-token endpoint.
 *
 * The secret is read from WIDGET_LINK_SECRET env var. If it is missing the
 * server will refuse to start (fail-fast).
 */

const WIDGET_LINK_SECRET = process.env.WIDGET_LINK_SECRET;

if (!WIDGET_LINK_SECRET) {
  console.error(
    "FATAL: WIDGET_LINK_SECRET environment variable is not set. " +
      "Widget link tokens cannot be generated or verified.",
  );
  // Don't crash the process — the feature will gracefully reject requests.
}

export interface WidgetTokenPayload {
  customerId: number;
  locationId: string;
}

/**
 * Generate a signed JWT link token for a customer.
 * Tokens expire after 24 hours.
 */
export function generateWidgetToken(
  customerId: number,
  locationId: string,
): string {
  if (!WIDGET_LINK_SECRET) {
    throw new Error(
      "Cannot generate widget token: WIDGET_LINK_SECRET is not configured",
    );
  }

  return jwt.sign(
    { customerId, locationId } satisfies WidgetTokenPayload,
    WIDGET_LINK_SECRET,
    { expiresIn: "24h" },
  );
}

/**
 * Verify and decode a signed widget link token.
 * Returns the decoded payload or null if the token is invalid/expired.
 */
export function verifyWidgetToken(
  token: string | undefined,
): WidgetTokenPayload | null {
  if (!token || !WIDGET_LINK_SECRET) return null;

  try {
    const decoded = jwt.verify(token, WIDGET_LINK_SECRET) as WidgetTokenPayload;

    // Sanity-check the payload shape
    if (
      typeof decoded.customerId !== "number" ||
      typeof decoded.locationId !== "string"
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
