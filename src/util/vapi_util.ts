import axios from "axios";

export const getMonoCallRecordingUrl = async (callId: string): Promise<string | null> => {
    try {
        const response = await axios.get(`https://api.vapi.ai/call/${callId}/mono-recording`, {
            headers: {
                "Authorization": `Bearer ${process.env.VAPI_API_KEY}`,
            },
            maxRedirects: 0, // Prevent automatic following of redirects
            validateStatus: (status) => status === 302, // Only consider 302 as valid
        });
        if (response.status === 302 && response.headers.location) {
            return (response.headers.location as string) || null;
        }
        return null;
    } catch (error) {
        console.error("Error fetching mono call recording URL:", error);
        return null;
    }
}