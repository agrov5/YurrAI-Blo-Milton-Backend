import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getWidgetAuthToken, locationID } from "../util/booker_util";
import { verifyWidgetToken } from "../util/widget_token_util";

// Store tokens temporarily with customer ID as key
const MAX_CACHE_SIZE = 1000;
const tokenCache = new Map<string, { token: string; expires: number }>();

/** Evict the oldest cache entry when the cache exceeds its size limit. */
function evictOldestCacheEntry(): void {
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey) tokenCache.delete(oldestKey);
  }
}

/** Set security headers required for PCI DSS compliance on payment pages. */
function setSecurityHeaders(res: Response): void {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; " +
      "script-src 'self' https://ccwidget.secure-booker.com 'unsafe-inline'; " +
      "connect-src 'self' https://*.secure-booker.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "frame-src https://ccwidget.secure-booker.com; " +
      "img-src 'self' data:",
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
}

export const getWidgetToken = async (req: Request, res: Response) => {
  try {
    // Verify the signed link token (prevents IDOR – caller must possess a valid JWT)
    const linkToken = req.query.linkToken as string;
    const verified = verifyWidgetToken(linkToken);
    if (!verified) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired link token",
      });
    }

    const customerId = String(verified.customerId);
    const locationId = String(verified.locationId);

    // Check cache first
    const cacheKey = `${customerId}_${locationId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({
        success: true,
        message: "Widget token retrieved from cache",
        AccessToken: cached.token,
      });
    }

    // Get fresh token with all required parameters
    const token = await getWidgetAuthToken();

    // Enforce cache size limit to prevent memory exhaustion
    evictOldestCacheEntry();

    // Cache for 5 minutes
    tokenCache.set(cacheKey, {
      token,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Widget token retrieved successfully",
      AccessToken: token,
    });
  } catch (error) {
    console.error("Failed to get widget token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve widget authentication token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const renderCCWidget = async (req: Request, res: Response) => {
  try {
    // Verify the signed JWT link token instead of trusting raw query params
    const linkToken = req.query.token as string;
    const verified = verifyWidgetToken(linkToken);

    if (!verified) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Invalid or Expired Link</h1>
          <p>Please use the link provided in your confirmation message. Links expire after 24 hours.</p>
        </body>
        </html>
      `);
    }

    // Use verified values from the JWT – not from query params (prevents IDOR)
    const customerId = String(verified.customerId);
    const verifiedLocationId = String(verified.locationId);

    // Sanitize locale to only allow safe BCP-47-like characters (prevents XSS)
    const rawLocale = (req.query.locale as string) || "en-US";
    const locale = rawLocale.replace(/[^a-zA-Z0-9\-]/g, "");

    // Validate customerId is a valid number
    const safeCustomerId = parseInt(customerId, 10);
    if (isNaN(safeCustomerId)) {
      return res.status(400).send("Invalid customer ID");
    }

    const safeLocationId =
      parseInt(verifiedLocationId, 10) || parseInt(locationID || "0", 10);

    // Render HTML WITHOUT the token
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Credit Card Widget</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #f5f7fa;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
      }

      #booker-cc-widget-container {
        width: 100%;
        max-width: 600px;
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      #booker-cc-widget-container.loaded {
        opacity: 1;
      }

      /* Responsive adjustments for mobile */
      @media (max-width: 768px) {
        body {
          padding: 0.5rem;
        }

        #booker-cc-widget-container {
          padding: 1.5rem;
          border-radius: 8px;
        }
      }

      @media (max-width: 480px) {
        #booker-cc-widget-container {
          padding: 1rem;
          max-width: 100%;
        }
      }

      /* Make widget inputs responsive */
      #booker-cc-widget-container input,
      #booker-cc-widget-container select,
      #booker-cc-widget-container button {
        max-width: 100% !important;
        width: 100% !important;
        font-size: 16px !important; /* Prevents zoom on iOS */
      }

      #booker-cc-widget-container input {
        padding: 0.75rem !important;
      }

      /* Loading spinner */
      .loading-container {
        text-align: center;
        padding: 3rem;
      }

      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-text {
        color: #666;
        font-size: 1rem;
      }

      .loading-container.hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="loading-container" id="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">Loading payment form...</div>
    </div>
    <div id="booker-cc-widget-container"></div>

    <script
      type="text/javascript"
      src="https://ccwidget.secure-booker.com/cc-widget-client.js"
    ></script>
    <script>
      (function() {
        const widgetConfig = {
          customerId: ${safeCustomerId},
          spaId: ${safeLocationId},
          locale: "${locale}"
        };

        // The signed link token is forwarded to the token endpoint for server-side verification
        const linkToken = ${JSON.stringify(linkToken)};

        async function getPartnerToken() {
          try {
            const response = await fetch('/widget/token?linkToken=' + encodeURIComponent(linkToken));
            const data = await response.json();
            return data.AccessToken;
          } catch (error) {
            console.error("Failed to get token:", error);
            throw error;
          }
        }

        function onEvent(data) {
          console.log("Widget event:", data);
          
          // Hide loading spinner when widget is ready
          if (data.type === 'ready' || data.event === 'ready') {
            hideLoadingSpinner();
          }
        }

        function hideLoadingSpinner() {
          const loadingContainer = document.getElementById('loading-container');
          const widgetContainer = document.getElementById('booker-cc-widget-container');
          
          if (loadingContainer) {
            loadingContainer.classList.add('hidden');
          }
          if (widgetContainer) {
            widgetContainer.classList.add('loaded');
          }
        }

        function initializeWidget() {
          if (window.ccWidgetBeacon && window.ccWidgetBeacon.loadWidget) {
            try {
              console.log("Initializing widget with config:", {
                customerId: widgetConfig.customerId,
                locationId: widgetConfig.spaId,
                locale: widgetConfig.locale
              });
              
              // Use the correct loadWidget signature with parameters directly
              window.ccWidgetBeacon.loadWidget(
                getPartnerToken,
                onEvent,
                widgetConfig.spaId,
                widgetConfig.customerId,
                widgetConfig.locale
              );

              // Fallback: Hide spinner after 3 seconds if no ready event
              setTimeout(function() {
                hideLoadingSpinner();
              }, 3000);
            } catch (error) {
              console.error("Error initializing widget:", error);
              hideLoadingSpinner();
            }
          } else {
            console.error("ccWidgetBeacon not available");
            setTimeout(initializeWidget, 500);
          }
        }

        // Wait for both DOM and widget beacon to load
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeWidget, 500);
          });
        } else {
          setTimeout(initializeWidget, 500);
        }
      })();
    </script>
  </body>
</html>
    `;

    setSecurityHeaders(res);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error rendering CC widget:", error);
    res.status(500).send("Error loading payment form");
  }
};
