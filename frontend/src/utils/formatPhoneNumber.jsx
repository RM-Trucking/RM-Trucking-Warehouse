const formatPhoneNumber = (value) => {
  if (!value) return value;
  // 1. Strip all non-numeric characters
  const phoneNumber = value.replace(/[^\d]/g, ''); 
  const phoneNumberLength = phoneNumber.length;

  if (phoneNumberLength < 4) return phoneNumber;
  
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }

  // 2. Updated to allow all digits up to the state limit (e.g., 20 chars total)
  // Maintains (XXX) XXX-XXXX format and appends any extra digits after that
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
};
export default formatPhoneNumber;
