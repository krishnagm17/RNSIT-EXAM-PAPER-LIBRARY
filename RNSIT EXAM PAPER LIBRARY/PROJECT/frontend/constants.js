import { IAType } from "./types.js";

export const DEPARTMENTS = [
    "CSE", "ISE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "AIDS"
];

export const SEMESTERS = [
    "1", "2", "3", "4", "5", "6", "7", "8"
];

export const YEARS = Array.from({ length: 10 }, (_, i) => (2018 + i).toString()); // 2018-2027

export const IA_TYPES = [IAType.IA1, IAType.IA2, IAType.IA3];

export const MODULES = ["1", "2", "3", "4", "5"];

// Mock Admin Credentials (as per requirements "set by me")
export const ADMIN_EMAIL = "admin@rnsit.ac.in";
export const ADMIN_PASSWORD = "rnsit@2025";

// Regex for RNSIT Email
export const RNSIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@rnsit\.ac\.in$/;
