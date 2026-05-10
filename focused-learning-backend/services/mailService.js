/**
 * Mock Mail Service (Simulated)
 * Only logs OTP to console for development.
 * Nodemailer logic removed as requested.
 */

const sendOTP = async (email, otp) => {
  try {
    console.log(`\n--- [SECURITY OTP SIMULATION] ---`);
    console.log(`To: ${email}`);
    console.log(`Code: ${otp}`);
    console.log(`Message: Please use this code to verify your account.`);
    console.log(`----------------------------------\n`);
    
    return true;
  } catch (error) {
    console.error("Simulation Error:", error);
    return false;
  }
};

module.exports = { sendOTP };
