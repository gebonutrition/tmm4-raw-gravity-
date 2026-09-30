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

    const headers = {
      "Authorization":
        `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      "Revision": "2026-07-15"
    };


    /* =========================
       1. CREATE / UPDATE PROFILE
       ========================= */

    const profileResponse = await fetch(
      "https://a.klaviyo.com/api/profile-import",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "profile",
            attributes: {
			  phone_number: phoneNumber,
			  external_id: `tmm4_${digits}`
			}
          }
        })
      }
    );

    const profileData =
      await profileResponse.json().catch(() => null);

    if (!profileResponse.ok) {
      console.error(
        "Klaviyo profile error:",
        profileData
      );

      return res.status(profileResponse.status).json({
        ok: false,
        error:
          profileData?.errors?.[0]?.detail ||
          "Klaviyo profile request failed"
      });
    }

    const profileId =
      profileData?.data?.id;

    if (!profileId) {
      console.error(
        "Klaviyo profile ID missing:",
        profileData
      );

      return res.status(500).json({
        ok: false,
        error: "Klaviyo profile ID missing"
      });
    }


    /* =========================
       2. ADD PROFILE TO LIST
       ========================= */

    const listResponse = await fetch(
      "https://a.klaviyo.com/api/lists/W8ZzTp/relationships/profiles",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: [
            {
              type: "profile",
              id: profileId
            }
          ]
        })
      }
    );

    const listText =
      await listResponse.text();

    if (!listResponse.ok) {
      console.error(
        "Klaviyo list error:",
        listResponse.status,
        listText
      );

      return res.status(listResponse.status).json({
        ok: false,
        error:
          "Failed to add profile to Klaviyo list"
      });
    }


    /* =========================
       SUCCESS
       ========================= */

    return res.status(200).json({
      ok: true
    });

  } catch (error) {

    console.error(
      "Klaviyo server error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
}