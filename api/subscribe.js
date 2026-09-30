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


    let digits =
      phone.replace(/\D/g, "");


    /*
     * Accept:
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


    const phoneNumber =
      `+1${digits}`;


    const headers = {
      "Authorization":
        `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,

      "Accept":
        "application/vnd.api+json",

      "Content-Type":
        "application/vnd.api+json",

      "Revision":
        "2026-07-15"
    };


    /*
     * STEP 1
     * Create or update Klaviyo profile.
     *
     * NO SMS SUBSCRIPTION.
     */
    const profileResponse =
      await fetch(
        "https://a.klaviyo.com/api/profile-import",
        {
          method: "POST",
          headers,

          body: JSON.stringify({
            data: {
              type: "profile",

              attributes: {
                phone_number: phoneNumber,

                properties: {
                  landing: "tmm4"
                }
              }
            }
          })
        }
      );


    const profileText =
      await profileResponse.text();


    let profileData = null;

    try {
      profileData =
        JSON.parse(profileText);
    } catch {
      profileData = null;
    }


    if (!profileResponse.ok) {

      console.error(
        "Klaviyo profile error:",
        profileResponse.status,
        profileText
      );

      return res.status(
        profileResponse.status
      ).json({
        ok: false,
        error:
          profileData?.errors?.[0]?.detail ||
          "Klaviyo profile creation failed"
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
        error:
          "Klaviyo profile ID missing"
      });

    }


    /*
     * STEP 2
     * Add existing profile to TMM4 list.
     *
     * This does NOT subscribe the profile
     * to SMS or email.
     */
    const listResponse =
      await fetch(
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

      let listData = null;

      try {
        listData =
          JSON.parse(listText);
      } catch {
        listData = null;
      }

      return res.status(
        listResponse.status
      ).json({
        ok: false,
        error:
          listData?.errors?.[0]?.detail ||
          "Klaviyo list add failed"
      });

    }


    /*
     * Klaviyo returns 204 here.
     */
    return res.status(200).json({
      ok: true,
      profileId
    });


  } catch (error) {

    console.error(
      "Klaviyo server error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Internal server error"
    });

  }
}