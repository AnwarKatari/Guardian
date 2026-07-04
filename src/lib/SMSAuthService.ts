import axios from 'axios';

/**
 * SMSAuthService
 * Utility to handle SMS-based OTP dispatch using Arkesel API.
 */
export const SMSAuthService = {
  async sendVerificationCode(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const arkeselKey = process.env.ARKESEL_API_KEY;
    if (!arkeselKey) {
      console.error("[SMSAuthService] ARKESEL_API_KEY not configured.");
      return { success: false, error: "SMS gateway misconfigured." };
    }

    const message = `Your verification code is: ${otp}. It expires in 10 minutes.`;
    const sender = "SafetyAlert";

    try {
      console.log(`[SMSAuthService] Dispatching OTP to ${phone}`);
      const response = await axios.post(`https://sms.arkesel.com/api/v2/sms/send`, {
        sender: sender,
        recipients: [phone],
        message: message
      }, {
        headers: { 'api-key': arkeselKey },
        timeout: 12000
      });

      const resData = response.data;
      if (resData && (resData.status === "success" || resData.code === "1000" || resData.code === 1000 || resData.code === 101)) {
        console.log(`[SMSAuthService] OTP SMS sent successfully.`);
        return { success: true };
      } else {
        console.error("[SMSAuthService] Arkesel rejected request:", JSON.stringify(resData));
        return { success: false, error: "Failed to dispatch SMS." };
      }
    } catch (error: any) {
      console.error("[SMSAuthService] Dispatch failed:", error);
      return { success: false, error: error.message };
    }
  }
};
