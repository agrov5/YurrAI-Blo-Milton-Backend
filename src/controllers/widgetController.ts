import { Request, Response } from "express";
import { getWidgetAuthToken, locationID } from "../util/booker_util";

export const renderCCWidget = async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId as string;
    const locale = (req.query.locale as string) || "en-US";

    if (!customerId) {
      return res.status(400).send("Missing customerId parameter");
    }

    // Get the widget token server-side
    const token = await getWidgetAuthToken();

    // Render HTML with embedded token
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
      src="https://ccwidget.secure-booker.com/cc-widget-beacon.js"
    ></script>
    <script>
      (function() {
        const widgetConfig = {
          customerId: ${parseInt(customerId)},
          spaId: ${parseInt(locationID || "0")},
          locale: "${locale}",
          token: "${token}"
        };

        function getClientToken() {
          return Promise.resolve(widgetConfig.token);
        }

        function onWidgetEvent(data) {
          console.log("Widget event:", data);
        }

        function initializeWidget() {
          if (window.ccWidgetBeacon && window.ccWidgetBeacon.loadWidget) {
            try {
              console.log("Initializing widget with config:", {
                customerId: widgetConfig.customerId,
                spaId: widgetConfig.spaId,
                locale: widgetConfig.locale
              });
              
              window.ccWidgetBeacon.loadWidget({
                getClientToken: getClientToken,
                onEvent: onWidgetEvent,
                spaId: widgetConfig.spaId,
                customerId: widgetConfig.customerId,
                locale: widgetConfig.locale,
              });
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
