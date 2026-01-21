import { Request, Response } from "express";
import { getWidgetAuthToken, locationID } from "../util/booker_util";

// Store tokens temporarily with customer ID as key
const tokenCache = new Map<string, { token: string; expires: number }>();

export const getWidgetToken = async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string;
    const locationId = req.query.locationId as string;

    if (!customerId || !locationId) {
      return res.status(400).json({
        success: false,
        message: "Both customerId and locationId are required",
      });
    }

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
    const customerId = req.query.customerId as string;
    const locale = (req.query.locale as string) || "en-US";

    if (!customerId) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body>
          <h1>Missing Customer ID</h1>
          <p>Please use the link provided in your confirmation message.</p>
        </body>
        </html>
      `);
    }

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
          customerId: ${parseInt(customerId)},
          spaId: ${parseInt(locationID || "0")},
          locale: "${locale}"
        };

        async function getPartnerToken() {
          try {
            const response = await fetch('/widget/token?customerId=' + widgetConfig.customerId + '&locationId=' + widgetConfig.spaId);
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

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error rendering CC widget:", error);
    res.status(500).send("Error loading payment form");
  }
};
