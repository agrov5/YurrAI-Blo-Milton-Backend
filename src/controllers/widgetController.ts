import { Request, Response } from "express";
import { getWidgetAuthToken, locationID } from "../util/booker_util";

// Store tokens temporarily with customer ID as key
const tokenCache = new Map<string, { token: string; expires: number }>();

export const getWidgetToken = async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string;
    const locationId = req.query.locationId as string;

    if (!customerId || !locationId) {
      return res
        .status(400)
        .json({ error: "Missing customerId or locationId parameter" });
    }

    // Check cache first
    const cacheKey = `${customerId}_${locationId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ AccessToken: cached.token });
    }

    // Get fresh token with all required parameters
    const token = await getWidgetAuthToken();

    // Cache for 5 minutes
    tokenCache.set(cacheKey, {
      token,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json({ AccessToken: token });
  } catch (error) {
    console.error("Failed to get widget token:", error);
    res.status(500).json({ error: "Failed to retrieve token" });
  }
};

export const renderCCWidget = async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string;
    const locale = (req.query.locale as string) || "en-US";

    if (!customerId) {
      return res.status(400).send("Missing customerId parameter");
    }

    // Render HTML WITHOUT the token
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Credit Card Widget</title>
  </head>
  <body>
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
            } catch (error) {
              console.error("Error initializing widget:", error);
            }
          } else {
            console.error("ccWidgetBeacon not available");
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
