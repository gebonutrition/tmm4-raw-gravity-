export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
   const { phone } = req.body || {};

	if (typeof phone !== "string") {
	  return res.status(400).json({
		ok: false,
		error: "Phone is required"
	  });
	}

	let digits = phone.replace(/\D/g, "");

	/*
	 * Accept both:
	 * 7868225855
	 * 17868225855
	 */
	if (
	  digits.length === 11 &&
	  digits.startsWith("1")
	) {
	  digits = digits.slice(1);
	}

	if (digits.length !== 10) {
	  return res.status(400).json({
		ok: false,
		error: "Invalid US phone number"
	  });
	}

	const phoneNumber = `+1${digits}`;

    const response = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs",
      {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Revision": "2026-07-15"
        },
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              profiles: {
                data: [
                  {
                    type: "profile",
                    attributes: {
                      phone_number: phoneNumber,
                      subscriptions: {
                        sms: {
                          marketing: {
                            consent: "SUBSCRIBED"
                          }
                        }
                      }
                    }
                  }
                ]
              },
              historical_import: false
            },
            relationships: {
              list: {
                data: {
                  type: "list",
                  id: "W8ZzTp"
                }
              }
            }
          }
        })
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Klaviyo error:", data);

      return res.status(response.status).json({
        ok: false,
        error: "Klaviyo request failed"
      });
    }

    return res.status(200).json({
      ok: true,
      data
    });

  } catch (error) {
    console.error("Klaviyo server error:", error);

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}