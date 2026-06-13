export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length > 120) return "Name must be 120 characters or fewer.";
  return null;
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Enter a valid phone number or leave blank.";
  }
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.length > 500) return "Bio must be 500 characters or fewer.";
  return null;
}

export function validateLocation(location: string): string | null {
  if (location.length > 120) return "Location must be 120 characters or fewer.";
  return null;
}

export function passwordStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (passwordStrengthScore(password) < 3) {
    return "Use upper and lower case, a number, and a symbol for a stronger password.";
  }
  return null;
}
