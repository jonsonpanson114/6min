const GAS_URL = "https://script.google.com/macros/s/AKfycbyQqLiqNIByyENlvLkiZ7SmT-nRxh-Wk67Mhz4MhAeMFCqgnYDAVDyYvHOPHjAA-z3eTw/exec";
const AUTH_TOKEN = "jonsonpanson";

async function test() {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: AUTH_TOKEN,
        app_name: "6min",
        action: "getSubscriptions"
      }),
    });
    
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
